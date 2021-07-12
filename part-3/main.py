from fastapi import FastAPI, HTTPException, status
from schema import HealthcareProvider, HealthcareProviderDB
from uuid import UUID, uuid4
from typing import Optional
from itertools import islice
from utils.file_pickle import save_obj, load_obj
from utils.math_utils import calculate_total_pages
from utils.constants import DB, NAME_TABLE, ADDRESS_TABLE, ORG_TABLE
from fastapi.staticfiles import StaticFiles


# The main in-memory dictionary that stores UUID as keys and HealthcareProvider.__dict__ as values
in_memory_db = {}

# Hash-map to store each name as key with the respective UUID as value
# Needed to check for existing names in O(1) time
# Can be used to search a provider based on Name
name_table = {}

# Hash-map similar to name_table but for organization
organization_table = {}

# Hash-map similar to name_table but for address_table
address_table = {}

# saves the hash-maps and in memory db dictionary to their respective pickle files
def dump_to_file():
    save_obj(in_memory_db, DB)
    save_obj(name_table, NAME_TABLE)
    save_obj(address_table, ADDRESS_TABLE)
    save_obj(organization_table, ORG_TABLE)

# reads data back to the respective global hash-maps and the main db from their pickle files
def read_from_file():
    global in_memory_db, name_table, address_table, organization_table
    try:
        in_memory_db = load_obj(DB)
        name_table = load_obj(NAME_TABLE)
        address_table = load_obj(ADDRESS_TABLE)
        organization_table = load_obj(ORG_TABLE)
    except FileNotFoundError:
        dump_to_file()
        print("Dump files created.")

# update the hash-maps with data inside provider
def add_to_unique_tables(provider: HealthcareProviderDB):
    name_table[provider.name] = provider.providerID
    organization_table[provider.organization] = provider.providerID
    address_table[provider.address] = provider.providerID

# remove the data inside provider from the repsective hash-maps
def del_from_unique_tables(provider: HealthcareProviderDB):
    del name_table[provider.name]
    del organization_table[provider.organization]
    del address_table[provider.address]

# makes sure that duplicate data isn't there for unique fields
def check_validity_unique_fields(provider: HealthcareProvider, uuid=None):
    '''
    Checks if the name, organization and address of the given provider are unique or already exist in the hash-map(s).
    It also makes sure to not raise false positive if the existing hash-map data is pointing to the same provider.

    Raises HTTPException if duplicate data found with status_code 400.
    '''
    if provider.name in name_table and name_table[provider.name] != uuid:
        raise HTTPException(
            status_code=400, detail="Provider with same name already exists.")

    if provider.organization in organization_table and organization_table[provider.organization] != uuid:
        raise HTTPException(
            status_code=400, detail="Provider with same organization already exists.")

    if provider.address in address_table and address_table[provider.address] != uuid:
        raise HTTPException(
            status_code=400, detail="Provider with same address already exists.")


# driver code
read_from_file()
app = FastAPI()


app.mount("/static", StaticFiles(directory="static"), name="static")


# creates a new provider from the body data provided
@app.post("/provider", status_code=201, description="Endpoint to create a new Healthcare Provider", tags=["Create"])
def create_provider(provider: HealthcareProvider):
    uuid = uuid4()

    check_validity_unique_fields(provider)

    provider_in_db = HealthcareProviderDB(**provider.dict(), providerID=uuid)
    in_memory_db[uuid] = provider.dict()

    add_to_unique_tables(provider_in_db)

    dump_to_file()

    return provider_in_db

# returns the provider with providerID=uuid if exists, 404 otherwise
@app.get("/provider", status_code=200, description="Endpoint to get a healthcare provider by their providerID", tags=["Read"])
def get_provider(uuid: UUID):
    if uuid not in in_memory_db.keys():
        raise HTTPException(
            status_code=404, detail="No Healthcare Provider with the given providerID exists.")

    provider = in_memory_db.get(uuid)
    provider_db = HealthcareProviderDB(**provider, providerID=uuid)

    return provider_db

# returns a list of providers of size {limit}(or less if not enough data) with total_pages and current page specified
# defaults to the first page with 100 elements
# can specify own page number and limit on number of elements
# can handle {limit} exceeding the total number of items
# throws 400 error if current page is greater than number of pages
@app.get("/providers", status_code=200, description="Endpoint to get list of all Healthcare Providers", tags=["Read"])
def get_providers(limit: Optional[int] = 100, page: Optional[int] = 1):
    page -= 1
    if len(in_memory_db) < limit:
        limit = len(in_memory_db)

    total_pages = calculate_total_pages(len(in_memory_db), limit)

    if total_pages == 0:
        return []

    if page > total_pages - 1:
        raise HTTPException(
            status_code=400, detail=f"Page supplied is greater than total number of pages. page = {page + 1} total_pages = {total_pages}")

    # creates None initialized list of size 'limit'
    providers = [None] * limit

    print(f'start is {page * limit} and len of db is {len(in_memory_db)}')
    start = page * limit

    # enumerate over the dictionary items from 'start' until 'start + limit', excluding 'start + limit'
    for idx, (uuid, provider) in enumerate(islice(in_memory_db.items(), start, start+limit)):
        providers[idx] = HealthcareProviderDB(**provider, providerID=uuid)

    return {"HealthcareProviders": providers, "page": page + 1, "total_pages": total_pages}

# updates the provider with providerID {uuid} with the given data
@app.put("/provider", status_code=200, description="Endpoint to update an existing Healthcare Provider for a given providerID", tags=["Update"])
def update_provider(uuid: UUID, provider: HealthcareProvider):
    if uuid not in in_memory_db.keys():
        raise HTTPException(
            status_code=404, detail="No Healthcare Provider with the given providerID exists.")

    check_validity_unique_fields(provider, uuid)

    provider_partial = provider.dict(exclude_unset=True)
    stored_provider = HealthcareProvider(**in_memory_db.get(uuid))

    del_from_unique_tables(stored_provider)

    updated_provider = stored_provider.copy(update=provider_partial)
    in_memory_db[uuid] = updated_provider.dict()
    updated_provider_db = HealthcareProviderDB(
        **updated_provider.dict(), providerID=uuid)

    add_to_unique_tables(updated_provider_db)

    dump_to_file()
    # print(updated_provider_db)
    return updated_provider_db

# deletes the provider with providerID {uuid}
@app.delete("/provider", status_code=200, description="Endpoint to delete an existing Healthcare Provider for a given providerID", tags=["Delete"])
def delete_provider(uuid: UUID):
    if uuid not in in_memory_db.keys():
        raise HTTPException(
            status_code=404, detail="No Healthcare Provider with the given providerID exists.")

    provider = in_memory_db.get(uuid)
    provider_db = HealthcareProviderDB(**provider, providerID=uuid)

    del in_memory_db[uuid]

    del_from_unique_tables(provider_db)

    dump_to_file()

    return provider_db

# deletes all records related to healthcare providers
@app.delete("/providers", status_code=200, description="Endpoint to erase all the Healthcare Providers from the DB", tags=["Delete"])
def delete_providers():
    name_table.clear()
    address_table.clear()
    organization_table.clear()
    in_memory_db.clear()
    dump_to_file()

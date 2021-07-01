import os
import pickle
from constants import DUMP_DIR

# ensures that the directory DUMP_DIR exists and creates it if not
def ensure_dump_dir():
    if not os.path.exists(DUMP_DIR):
        os.makedirs(DUMP_DIR)
        print(f'Dumps directory {DUMP_DIR} created.')

# serializes and saves an object obj to a file named name using the pickle module in binary format
def save_obj(obj, name):
    ensure_dump_dir()
    with open(DUMP_DIR + name + '.pkl', 'wb') as f:
        pickle.dump(obj, f, pickle.HIGHEST_PROTOCOL)

# deserializes and loads serialized data stored in DUMP_DIR/name.pkl and returns the resulting object
def load_obj(name):
    ensure_dump_dir()
    with open(DUMP_DIR + name + '.pkl', 'rb') as f:
        return pickle.load(f)
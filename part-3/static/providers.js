let selectedRow = null      // current selected row to track edit/delete
let currentPage = 1;        // current page being displayed given itemsPerPage
let totalPages = 1;         // current total number of pages given itemsPerPage
let itemsPerPage = 10;      // current (max) number of items being displayed per page

// shows an Android style Toast message at the bottom of screen
function showToast(message) {
    new Android_Toast({
        content: message,
        duration: 4000,
        position: 'bottom'
    });
}

// handles form submit button click
function onFormSubmit() {
    let formData = readFormData();
    if (selectedRow == null)
        insertNewRecord(JSON.stringify(formData));
    else
        updateRecord(JSON.stringify(formData), selectedRow.cells[0].innerHTML);
}

// updates number of items per page and refreshes the UI
function updateLimit(value) {
    itemsPerPage = value;
    currentPage = 1;
    fetchData();
}

// returns an object containing the form data
function readFormData() {
    let formData = {};
    formData["name"] = document.getElementById("name").value;
    formData["qualification"] = [document.getElementById("qualification").value];
    formData["specialty"] = [document.getElementById("speciality").value];
    formData["phone"] = document.getElementById("phone").value;
    formData["department"] = document.getElementById("department").value;
    formData["organization"] = document.getElementById("org").value;
    formData["location"] = document.getElementById("location").value;
    formData["address"] = document.getElementById("address").value;
    formData["active"] = document.getElementById("enabled").checked;

    return formData;
}

// iterates through the table and updates the row containing provider data upon match
function updateExistingRow(provider) {
    for (row of table.rows) {
        if (row.cells[0].innerHTML == provider.providerID) {
            row.cells[1].innerHTML = provider.name;
            row.cells[2].innerHTML = provider.qualification;
            row.cells[3].innerHTML = provider.specialty;
            row.cells[4].innerHTML = provider.phone;
            row.cells[5].innerHTML = provider.department;
            row.cells[6].innerHTML = provider.organization;
            row.cells[7].innerHTML = provider.location;
            row.cells[8].innerHTML = provider.address;
            row.cells[9].innerHTML = provider.active;
            break;
        }
    }
}



// clears the table and populates it with given list of providers
function populate(providers) {
    clearTable();
    providers.HealthcareProviders.forEach(provider => {
        if (provider == null) return;
        let newRow = table.insertRow(table.length);
        cell1 = newRow.insertCell(0);
        cell1.innerHTML = provider.providerID;
        cell2 = newRow.insertCell(1);
        cell2.innerHTML = provider.name;
        cell3 = newRow.insertCell(2);
        cell3.innerHTML = provider.qualification;
        cell4 = newRow.insertCell(3);
        cell4.innerHTML = provider.specialty;
        cell5 = newRow.insertCell(4);
        cell5.innerHTML = provider.phone;
        cell6 = newRow.insertCell(5);
        cell6.innerHTML = provider.department;
        cell7 = newRow.insertCell(6);
        cell7.innerHTML = provider.organization;
        cell8 = newRow.insertCell(7);
        cell8.innerHTML = provider.location;
        cell9 = newRow.insertCell(8);
        cell9.innerHTML = provider.address;
        cell10 = newRow.insertCell(9);
        cell10.innerHTML = provider.active;
        cell11 = newRow.insertCell(10);
        cell11.innerHTML = `<a onClick="onEdit(this)">Edit</a>
                       <a onClick="onDelete(this)">Delete</a>`;
    });
}

// empties the table and resets selectedRow
function resetForm() {
    document.getElementById("name").value = "";
    document.getElementById("qualification").value = "";
    document.getElementById("speciality").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("department").value = "";
    document.getElementById("org").value = "";
    document.getElementById("location").value = "";
    document.getElementById("address").value = "";
    document.getElementById("enabled").checked = true;

    selectedRow = null;
}

// fills the form with selected table row so the user can edit and submit
function onEdit(td) {
    selectedRow = td.parentElement.parentElement;
    document.getElementById("name").value = selectedRow.cells[1].innerHTML;
    document.getElementById("qualification").value = selectedRow.cells[2].innerHTML;
    document.getElementById("speciality").value = selectedRow.cells[3].innerHTML;
    document.getElementById("phone").value = selectedRow.cells[4].innerHTML;
    document.getElementById("department").value = selectedRow.cells[5].innerHTML;
    document.getElementById("org").value = selectedRow.cells[6].innerHTML;
    document.getElementById("location").value = selectedRow.cells[7].innerHTML;
    document.getElementById("address").value = selectedRow.cells[8].innerHTML;
    if (selectedRow.cells[9].innerHTML == "false")
        document.getElementById("disabled").checked = true;
}

// updates the next and prev page navigation buttons to handle first, last and other pages
function togglePageButtons() {
    let next = document.getElementsByClassName("next")[0];
    if (currentPage == totalPages) {
        next.classList.add("disabled");
    } else {
        next.classList.remove("disabled");
    }
    let prev = document.getElementsByClassName("prev")[0];
    if (currentPage == 1) {
        prev.classList.add("disabled");
    } else {
        prev.classList.remove("disabled");
    }
}

// handles next page button click by updating current page and calling fetchData()
function fetchNext() {
    let next = document.getElementsByClassName("next")[0];
    if (next.classList.contains("disabled")) {
        return false;
    }
    currentPage++;
    fetchData();
}

// handles previous page button click by updating current page and calling fetchData()
function fetchPrev() {
    let prev = document.getElementsByClassName("prev")[0];
    if (prev.classList.contains("disabled")) {
        return false;
    }
    currentPage--;
    fetchData();
}

// handles delete button click
function onDelete(td) {
    if (confirm('Are you sure to delete this record ?')) {
        row = td.parentElement.parentElement;
        deleteRecord(row.cells[0].innerHTML, row);
        resetForm();
    }
}

// deletes all rows of table
function clearTable() {
    var tableHeaderRowCount = 0;
    var rowCount = table.rows.length;
    for (var i = tableHeaderRowCount; i < rowCount; i++) {
        table.deleteRow(tableHeaderRowCount);
    }
}

// sends post request to /provider with given dataToSend
function insertNewRecord(dataToSend) {
    fetch("/provider", {
        credentials: "same-origin",
        mode: "same-origin",
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: dataToSend
    })
    .then(resp => {
        if (resp.status === 201) {
            fetchData();
            return resp.json()
        } else {
            return Promise.reject(resp)
        }
    })
    .then(dataJson => {
        // console.log("FINAL ONE" + dataJson)
        // dataReceived = JSON.parse(dataJson)
    })
    .catch(err => {
        console.log(err.status, err.statusText);
        err.json().then((json) => {
            console.log(json);
            showToast(json.detail);
        })
    })
}

// sends a GET request to /providers with appropriate pagination query parameters
function fetchData() {
    fetch("/providers?" + new URLSearchParams({
        limit: itemsPerPage,
        page: currentPage
    }), {
        credentials: "same-origin",
        mode: "same-origin",
        method: "get",
        headers: { "Content-Type": "application/json" }
    })
        .then(resp => {
            if (resp.status === 200) {
                response = resp.json();
                return response;
            } else {
                return Promise.reject(resp);
            }
        })
        .then(data => {
            resetForm();
            populate(data);
            currentPage = data.page;
            totalPages = data.total_pages;
            let pageIndicator = document.getElementsByClassName("page-num")[0];
            pageIndicator.innerHTML = currentPage + ' / ' + totalPages;
            togglePageButtons();
        })
        .catch(err => {
            console.log(err.status, err.statusText);
            err.json().then((json) => {
                console.log(json);
                showToast(json.detail);
            })
        })
}

// sends put request to /provider with given uuid and dataToSend
function updateRecord(dataToSend, uuid) {
    fetch("/provider?" + new URLSearchParams({
        uuid: uuid
    }), {
        credentials: "same-origin",
        mode: "same-origin",
        method: "put",
        headers: { "Content-Type": "application/json" },
        body: dataToSend
    })
        .then(resp => {
            if (resp.status === 200) {
                resetForm();
                response = resp.json();
                return response;
            } else {
                return Promise.reject(resp);
            }
        })
        .then(dataJson => {
            updateExistingRow(dataJson);
        })
        .catch(err => {
            console.log(err.status, err.statusText);
            err.json().then((json) => {
                console.log(json);
                showToast(json.detail);
            })
        })
}

// sends delete request to /provider with given uuid
function deleteRecord(uuid, row) {
    fetch("/provider?" + new URLSearchParams({
        uuid: uuid
    }), {
        credentials: "same-origin",
        mode: "same-origin",
        method: "delete"
    })
        .then(resp => {
            if (resp.status === 200) {
                document.getElementById("table-list").deleteRow(row.rowIndex);
                return resp.json();
            } else {
                return Promise.reject(resp);
            }
        })
        .then(dataJson => {
            dataReceived = JSON.parse(dataJson);
        })
        .catch(err => {
            console.log(err.status, err.statusText);
            err.json().then((json) => {
                console.log(json);
                showToast(json.detail);
            })
        })
}

const table = document.getElementById("table-list").getElementsByTagName('tbody')[0];
fetchData();
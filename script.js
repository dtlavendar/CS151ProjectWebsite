
var facts = [];
var rules = [];


function newTheory() {
    return prepareTheory([]);
}

facts = newTheory();
rules = newTheory();

// as a precaution, we shadow Array.prototype.at -> so it does not collide with our 
// at(P,F) facts.
function prepareTheory(theory) {
    Object.defineProperty(theory, "at", {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: false
    });
    return theory;
}

//==============================================================================
// Logic helpers — Epilog-facing API (merge anchor: keep this section intact)goes until viewRulesText
//==============================================================================

/**
 * returns true if query is true given the current facts and rules
 */
function isTrue(query) {
    return compfindp(query, facts, rules);
}

/**
 * takes in an expression, a sentence, a dataset, and a ruleset and returns all instances of the query
 * if none it retunrs []
 */
function findAll(result, query) {
    return compfinds(result, query, facts, rules);
}

/**
 * gets the first instance of the query and returns the result that it finds. 
 */
function findOne(result, query) {
    return compfindx(result, query, facts, rules);
}

/**
 * based on whether the action passes a string or an object. if it passes a string, it returns the string. 
 * if it passes an object, it returns the type of the object. if it passes nothing, it returns null.
 */
function getActionKey(action) {
    if (typeof action === "string") {
        return action;
    }
    if (action && typeof action.type === "string") {
        return action.type;
    }
    return null;
}

/**
 * Fills in the dropdown menu with who can board and be dropped off. 
 */
function fillSelectWithPeople(selectPerson, people) {
    var option;
    var i;

    selectPerson.innerHTML = "";

    if (people.length === 0) {
        option = document.createElement('option');
        option.value = "";
        option.textContent = "(no one)";
        selectPerson.appendChild(option);
        selectPerson.disabled = true;
        return;
    }

    selectPerson.disabled = false;

    for (i = 0; i < people.length; i++) {
        option = document.createElement('option');
        option.value = people[i];
        option.textContent = people[i];
        selectPerson.appendChild(option);
    }
}

/**
 * provides the list of who can be boarded and dropped off.
 */
function updatePassengerList() {
    var people_canboard = findAll("P", seq("can_board", "P"));
    var people_candrop = findAll("P", seq("can_drop", "P"));

    var boardPerson = document.getElementById("board-action");
    var dropPerson = document.getElementById("drop-action");

    fillSelectWithPeople(boardPerson, people_canboard, "no one");
    fillSelectWithPeople(dropPerson, people_candrop, "no one");

    var boardButton = document.getElementById("board-button");
    var dropButton = document.getElementById("drop-button");
    if (people_canboard.length === 0) {
        boardButton.disabled = true;
    } else {
        boardButton.disabled = false;
    }
    if (people_candrop.length === 0) {
        dropButton.disabled = true;
    } else {
        dropButton.disabled = false;
    }
}

/**
 * Will board a person
 */
function helpBoard() {
    var person = document.getElementById("board-action").value;
    if (person) {
        runAction({type: "board", person: person});
    }
}

/**
 * Will drop off a person
 */
function helpDrop() {
    var person = document.getElementById("drop-action").value;
    if (person) {
        runAction({type: "drop", person: person});
    }
}

/**
 * detects the drop or board button being clicked and will either board or drop off a person
 * depending on the button clicked.
 */
function wireDropBoardControl() {
    document.querySelector("#board-button").addEventListener("click", helpBoard);
    document.querySelector("#drop-button").addEventListener("click", helpDrop);
}


/**
 * disables the move buttons if the elevator is at the top or bottom floor.
 */
function disableMoveButtons(){
    var currentFloor = findOne("F", seq("elevator_at", "F"));
    var topFloor = findOne("T", seq("top", "T"));
    var bottomFloor = findOne("B", seq("bottom", "B"));
    if (currentFloor === topFloor) {
        document.querySelector("#btn-move-up").disabled = true;
    } else {
        document.querySelector("#btn-move-up").disabled = false;
    }
    if (currentFloor === bottomFloor) {
        document.querySelector("#btn-move-down").disabled = true;
    } else {
        document.querySelector("#btn-move-down").disabled = false;
    }
}

function wireMoveButtons(){
    document.querySelector("#btn-move-up").addEventListener("click", function() { runAction("move_up"); });
    document.querySelector("#btn-move-down").addEventListener("click", function() { runAction("move_down"); });
    disableMoveButtons();
}

/**
* Returns a message with the current status of the game.
*/
function inProgressStatus() {
    var floor = findOne("F", seq("elevator_at", "F"));
    var peopleInElevator = findAll("P", seq("inside", "P"));
    var capacity = findOne("C", seq("capacity", "C"));
    var moves = findOne("N", seq("moves", "N"));

    if (peopleInElevator.length === 1) {
        return "Elevator at floor " + floor + " with " + peopleInElevator.length + " person onboard (out of " 
        + capacity + " possible). | # of moves: " + moves;        
    }
    else {
        return "Elevator at floor " + floor + " with " + peopleInElevator.length + " people (out of " 
    + capacity + " possible). | # of moves: " + moves;
    }
}

//==============================================================================
// Handling Canvas Elevator Functionality
//==============================================================================

var canvasStarted = false;

/**
 * Collects each person's current location and destination for the canvas.
 * Those inside the elevator have a pending at(P,F) fact until they are dropped.
 */
function getPeopleForCanvas() {
    var people = findAll("P", seq("person", "P"));
    var personInfo = [];
    var person;
    var current;
    var destination;
    var inside;
    var i;

    for (i = 0; i < people.length; i++) {
        person = people[i];
        inside = isTrue(seq("inside", person));
        current = inside ? "" : findOne("F", seq("at", person, "F"));
        destination = findOne("W", seq("wants", person, "W"));

        personInfo.push({
            name: person,
            current: current,
            destination: destination,
            inside: inside,
            done: !inside && current === destination
        });
    }

    return personInfo;
}

/**
 * Shows the canvas and draws floor circles connected like a simple elevator map.
 * This reads from the same Epilog facts that drive the existing buttons.
 */
function drawElevatorCanvas() {
    var canvas = document.querySelector("#floor-canvas");
    var building = document.querySelector("#building");
    var ctx;
    var floorCount = Number(findOne("T", seq("top", "T")));
    var currentFloor = Number(findOne("F", seq("elevator_at", "F")));
    var people = getPeopleForCanvas();
    var peopleByFloor = {};
    var elevatorPeople = [];
    var x = 120;
    var topY = 35;
    var bottomY = 240;
    var gap = floorCount > 1 ? (bottomY - topY) / (floorCount - 1) : 0;
    var floor;
    var y;
    var i;

    if (!canvas || !canvas.getContext) {
        return;
    }

    building.classList.add("is-visible");
    ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.stroke();

    for (i = 0; i < people.length; i++) {
        if (people[i].inside) {
            elevatorPeople.push(people[i]);
        } else {
            if (!peopleByFloor[people[i].current]) {
                peopleByFloor[people[i].current] = [];
            }
            peopleByFloor[people[i].current].push(people[i]);
        }
    }

    for (floor = 1; floor <= floorCount; floor++) {
        y = bottomY - ((floor - 1) * gap);
        drawFloorNode(ctx, floor, currentFloor, x, y);
        drawPeopleLabel(ctx, peopleByFloor[floor] || [], x + 105, y + 4);
        if (floor === currentFloor) {
            drawElevatorPeopleLabel(ctx, elevatorPeople, x + 105, y + 20);
        }
    }
}

/**
 * Draws one floor circle. The active elevator floor is intentionally simple:
 * a yellow fill and light glow so the current level is easy to see.
 */
function drawFloorNode(ctx, floor, currentFloor, x, y) {
    var active = floor === currentFloor;

    ctx.save();
    ctx.shadowBlur = active ? 12 : 0;
    ctx.shadowColor = active ? "#e8d44f" : "transparent";
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#f3df55" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#333333";
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#222222";
    ctx.font = "13px Times, Times New Roman, serif";
    ctx.fillText("Floor " + floor, x + 24, y + 4);
}

function drawPeopleLabel(ctx, people, x, y) {
    if (people.length === 0) {
        return;
    }

    ctx.fillStyle = "#000066";
    ctx.font = "13px Times, Times New Roman, serif";
    ctx.fillText(formatPeopleList(people, 3), x, y);
}

function formatPersonLabel(person) {
    if (person.done) {
        return person.name + " done";
    }
    return person.name + " -> " + person.destination;
}

function drawElevatorPeopleLabel(ctx, people, x, y) {
    if (people.length === 0) {
        return;
    }

    ctx.fillStyle = "#000000";
    ctx.font = "13px Times, Times New Roman, serif";
    ctx.fillText("Elevator: " + formatPeopleList(people, 3), x, y);
}

function formatPeopleList(people, limit) {
    var labels = [];
    var i;

    for (i = 0; i < people.length && i < limit; i++) {
        labels.push(formatPersonLabel(people[i]));
    }

    if (people.length > limit) {
        labels.push("+" + (people.length - limit) + " more");
    }

    return labels.join(", ");
}
// Finish Canvas Functionality
//
//



function startPuzzle() {
    canvasStarted = true;
    loadPuzzle();
    drawElevatorCanvas();
}

/**
 * updates the UI 
 */
function updateUI(outcome) {
    if (!outcome.ok) {
        return;
    }
    disableMoveButtons();

    updatePassengerList();
    document.querySelector("#move-count").textContent = findOne("N", seq("moves", "N"));

    if (isTrue("solved")) {
        document.querySelector("#status-message").textContent = "Congratulations! You solved the puzzle!";
    } else {
        document.querySelector("#status-message").textContent = inProgressStatus();
    }

    // we're calling the canvas here
    if (canvasStarted) {
        drawElevatorCanvas();
    }
}

/**
 * based on the action, it returns the outcome of the action. gives an error if the action is not valid.
 * if the action is valid, it returns the outcome of the action and updates the state.
 */
function runAction(action) {
    var key = getActionKey(action);
    var actionFunction = key && ACTION_HANDLERS[key];
    if (!actionFunction) {
        return {ok:false, reason: "Unvalid action" + key };
    }
    var outcome = actionFunction(action);
    if (outcome.ok) {
        updateUI(outcome);
    }
    return outcome;
}


var ACTION_HANDLERS = {
    "move_up": function(action) {
        var floor = Number(findOne("FLOORNUM", seq("elevator_at", "FLOORNUM")))
        if (floor === Number(findOne("TOP", seq("top", "TOP")))) {
            return {ok:false, reason: "Already at top floor"};
        }
        var newFloor = floor + 1;

        dropfact(seq("elevator_at", floor.toString()), facts);
        insertfact(seq("elevator_at", newFloor.toString()), facts);

        var moves = findOne("MOVENUM", seq("moves", "MOVENUM"));
        dropfact(seq("moves", moves), facts);
        insertfact(seq("moves", (Number(moves) + 1).toString()), facts);
        
        return {ok:true, reason: "Went up to floor " + newFloor};
    },
    "move_down": function(action) {
        var floor = findOne("FLOORNUM", seq("elevator_at", "FLOORNUM"));
        if (floor === findOne("BASEFLOOR", seq("bottom", "BASEFLOOR"))) {
            return {ok:false, reason: "Already at bottom floor"};
        }
        var newFloor = Number(floor) - 1;
        dropfact(seq("elevator_at", floor), facts);
        insertfact(seq("elevator_at", newFloor.toString()), facts);


        var moves = findOne("MOVENUM", seq("moves", "MOVENUM"));
        dropfact(seq("moves", moves), facts);
        insertfact(seq("moves", (Number(moves) + 1).toString()), facts);

        return {ok:true, reason: "Went down to floor " + newFloor};
    },
    "board": function(action) {
        var person = action.person;
        if (!person) {
            return {ok:false, reason: "No person specified"};
        }
        if (!isTrue(seq("can_board", person))) {
            return {ok:false, reason: "Person cannot board"};
        }
        var floor = findOne("F", seq("at", person, "F"));
        dropfact(seq("at", person, floor), facts);
        insertfact(seq("inside", person), facts);
        return {ok:true, reason: "boarded successfully"};
    },
    "drop": function(action) {
        var person = action.person;
        if (!person) {
            return {ok:false, reason: "No person specified"};
        }
        if (!isTrue(seq("can_drop", person))) {
            return {ok:false, reason: "Person cannot be dropped off"};
        }
        var floor = findOne("F", seq("elevator_at", "F"));
        dropfact(seq("inside", person), facts);
        insertfact(seq("at", person, floor), facts);
        return {ok:true, reason: "dropped off"};
    }
};

var viewRulesText =
    'done(P) :- at(P,F) & wants(P,F).\n' +
    'can_move_up :- elevator_at(F) & top(T) & less(F,T).\n' +
    'can_move_down :- elevator_at(F) & bottom(B) & less(B,F).\n' +
    'can_board(P) :- person(P) & elevator_at(F) & at(P,F) & capacity(C) & countofall(X,inside(X),N) & less(N,C).\n' +
    'can_drop(P) :- inside(P).\n' +
    'solved :- countofall(P,person(P),Total) & countofall(P,done(P),Done) & same(Total,Done).';

function init() {
    // initializes the program, runs once page loads.
    document.querySelector("#btn-start-puzzle").addEventListener("click", startPuzzle);
    setValue();
    disableMoveButtons();
    wireDropBoardControl();
    wireMoveButtons();
}

document.addEventListener("DOMContentLoaded", init);

function resetProgram() {
    // everything that they've done so far should reset here.
    // all variables, all animations, outputs should halt & reset
    loadPuzzle();
}

function setValue() {
    document.querySelector("#floor-count-label").textContent =
        document.querySelector("#floor-count").value;
    document.querySelector("#capacity-label").textContent =
        document.querySelector("#capacity").value;
    document.querySelector("#person-count-label").textContent =
        document.querySelector("#person-count").value;
}

function readNumberInput(id, fallback, min, max) {
    var el = document.querySelector("#" + id);
    var value = parseInt(el.value, 10);
    // sanity checking input
    if (isNaN(value)) {
        value = fallback;
    }
    if (value < min) {
        value = min;
    }
    if (value > max) {
        value = max;
    }
    el.value = value;
    return value;
}

function personName(index) {
    return "p" + index;
}

// auto placement w/ default
function getPlacement(index, floorCount) {
    var start = ((index - 1) % floorCount) + 1;
    var wants = (index % floorCount) + 1;
    if (wants === start) {
        wants = (wants % floorCount) + 1;
    }
    return { start: start, wants: wants };
}

// makes a list for floor and person facts
function buildFacts(floorCount, capacity, personCount) {
    var data = [];
    var f;

    for (f = 1; f <= floorCount; f++) {
        data.push(seq("floor", f.toString()));
    }

    data.push(seq("top", floorCount.toString()));
    data.push(seq("bottom", "1"));
    data.push(seq("capacity", capacity.toString()));
    data.push(seq("elevator_at", "1"));
    data.push(seq("moves", "0"));

    for (f = 1; f <= personCount; f++) {
        var person = personName(f);
        var placement = getPlacement(f, floorCount);
        data.push(seq("person", person));
        data.push(seq("at", person, placement.start.toString()));
        data.push(seq("wants", person, placement.wants.toString()));
    }

    return data;
}

function loadPuzzle() {
    var floorCount = readNumberInput("floor-count", 4, 2, 10);
    var capacity = readNumberInput("capacity", 2, 1, 5);
    var personCount = readNumberInput("person-count", 3, 1, 10);

    emptytheory(facts);
    prepareTheory(facts);
    definemorefacts(facts, buildFacts(floorCount, capacity, personCount));

    emptytheory(rules);
    prepareTheory(rules);
    definemorerules(rules, readdata(viewRulesText));

    document.querySelector("#move-count").textContent = "0";
    sanityCheck(floorCount, capacity, personCount);
    updatePassengerList();
    disableMoveButtons();
    if (canvasStarted) {
        drawElevatorCanvas();
    }
}

// for debugging purposes
function sanityCheck(floorCount, capacity, personCount) {
    var persons = compfinds("P", seq("person", "P"), facts, rules);
    var floors = compfinds("F", seq("floor", "F"), facts, rules);
    var elevatorAtOne = compfindp(seq("elevator_at", "1"), facts, rules);
    var capacityOk = compfindp(seq("capacity", capacity.toString()), facts, rules);
    var solved = compfindp("solved", facts, rules);

    console.log("--- puzzle sanity check ---");
    console.log("elevator at floor 1:", elevatorAtOne);
    console.log("capacity", capacity + ":", capacityOk);
    console.log("person count:", persons.length, "(expected", personCount + ")");
    console.log("floor count:", floors.length, "(expected", floorCount + ")");
    console.log("people:", persons);
    console.log("solved:", solved);
    console.log("facts loaded:", facts.length);

    document.querySelector("#status-message").textContent =
        "Puzzle loaded: " + floorCount + " floors, " + personCount +
        " people, capacity " + capacity + ".";
}

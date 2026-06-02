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
    if (!outcome.ok) {
        updateUI(outcome);
    }
    return outcome;
}

function updateUI(outcome) {
    if (outcome.ok) {
        return;
    }
}

var ACTION_HANDLERS = {
    "move_up": function(action) {
        return {ok:true, reason: "Moved up"};
    },
    "move_down": function(action) {
        return {ok:true, reason: "Moved down"};
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
    document.querySelector("#btn-start-puzzle").addEventListener("click", loadPuzzle);
    setValue();
    loadPuzzle();
}

document.addEventListener("DOMContentLoaded", init);

function resetProgram() {
    // everything that they've done so far should reset here.
    // all variables, all animations, outputs should halt & reset
    loadPuzzle();
}

function setValue() {
    document.querySelector("#elevator-num").textContent =
        document.querySelector("#elevator-number-input").value;
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

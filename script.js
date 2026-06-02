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

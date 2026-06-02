function init() {
    // initializes the program, runs once page loads.
    setValue();
}

document.addEventListener("DOMContentLoaded", init);

function resetProgram() {
    // everything that they've done so far should reset here.
    // all variables, all animations, outputs should halt & reset


}


function setValue() {
    // single-elevator puzzle: slider is fixed at 1.
    resetProgram();

    var num = document.querySelector("#elevator-number-input").value.toString();
    document.querySelector("#elevator-num").textContent = num;

    // var speed = document.querySelector("#elevator-speed-input").value.toString();
    // document.querySelector("#elevator-speed").textContent = speed;
}



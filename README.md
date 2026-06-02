# CS151ProjectWebsite
Group Project for CS151 Website Implementing Elevator Problem

---


# Tasks Completed
- Finished importing epilog.js (in epilog scripts)
- Added scaffolding to website design
- Added sliders for main design
- Added basic assets to assets page

# Tasks To-Do
- Set up animation process
- Create logic program with basic variables
- Format settings towards bottom
- Think about making tests

- Logic helpers in script.js
  - isTrue(query) -> wrapper around compfindp
  - findAll(result, query) -> wrapper around compfinds
  - runAction(action) -> unified entry point for all player moves

-   Move up / Move down in script.js
  - action handlers that check can_move_up / can_move_down
  - update elevator_at(F) facts (remove old, add new)
  - increment moves(N) on each floor change
  - wire Move Up and Move Down buttons
  - disable buttons when move is illegal

-  Board / drop in script.js, maybe website.html
  - board(P) ->  check can_board(P), remove at(P,F), add inside(P)
  - drop(P) -> check can_drop(P), remove inside(P), add at(P,F) at elevator floor (any floor, not just destination)
  - generate board buttons for people waiting on elevator's current floor
  - generate drop buttons for people inside the elevator

- Render game & win state in script.js & website.html
  - fill #building with floor list (top to bottom)
  - show waiting people, onboard passengers, elevator position
  - show each person's destination (wants)
  - update #move-count from moves(N) fact after each action
  - show win message when solved is true
  - re-render after every action

 - Presets & polish in script.js & website.html
   - named preset puzzles (eg : 4-floor, 3-person example)
   - reset button to restart current puzzle
   - pick start/destination per person (optional? i think?)
 
 - Styling in style.css
   - layout for building / floors / elevator
   - disabled button styling
   - instructions?    

# Current Website Design
<img width="1502" height="1011" alt="Screenshot 2026-05-27 at 5 59 51 PM" src="https://github.com/user-attachments/assets/e7ea80b6-b1d4-4538-adfe-0edb603d79c0" />

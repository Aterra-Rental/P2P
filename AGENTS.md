# Repository Guidelines

## System Architecture

This P2P escrow tracker uses React 19 + Vite (`Frontend/`), Flask + Flask-SocketIO (`Backend/myproject/p2p_deal_app/`), and PostgreSQL. The local Flask server runs at `http://localhost:8000`; Vite proxies HTTP `/api` requests there, while the shared frontend Socket.IO client connects directly to that origin.

The Flask API is organized as blueprints. Keep responsibilities separated:

- `routes/room.py`: room creation, invitations, reminders, and room reads.
- `routes/deal.py`: roles, amount negotiation, payment state, release, disputes, and completion.
- `socketio_instance.py`: the single shared `socketio` object and event handlers.
- `app.py`: initialize that shared object, register blueprints, and start with `socketio.run(...)`—never create another Socket.IO instance or use `app.run()`.
- `database.py` / `config.py`: PostgreSQL connection and configuration.

`deal_tracker/` and `users/` are older Django code; do not change them unless explicitly requested. Treat PostgreSQL and API responses as the source of truth. Socket events only announce that persistent state changed.

## Deal Workflow and Data Decisions

The intended progression is invitation accepted → role selection → role confirmation → deal/amount confirmation → payment → release → completed, with disputes as an alternate path.

Reuse the existing `buyer` and `seller` tables; do not add temporary role tables. The first successful role-selection request assigns both users. `ready` means role confirmed, while `amount_confirmed` means amount confirmed. Both users must confirm roles before moving the room to `RolesAssigned` / `DealConfirmation`. A disagreement deletes both role rows and restarts role selection. Chat is part of amount negotiation.

Important deal changes must synchronize both clients through Socket.IO. Use consistent event and room names, join the appropriate `deal_<room_code>` and/or authenticated `user_<user_id>` rooms, then have listeners reload current API data. Rejoin rooms after reconnecting.

## Current Progress and Blockers

Completed foundations include registration/login with bcrypt, profile and KYC uploads, admin KYC review, room invitations/reminders, modular blueprints, PostgreSQL access, the Deal Workspace shell, buyer/seller joins in `get_room()`, and initial role/amount/payment routes.

The immediate blocker is real-time deal synchronization. The repository already imports one shared backend Socket.IO instance and starts via `socketio.run`, but registration, room names, reconnect behavior, and frontend listeners still require end-to-end verification. The current role UI is incomplete: `RoleSelector.jsx` expects `roleState`, but `DealWorkspace.jsx` renders it without that prop; `getDealRoles()` is unused, and `role_selection_reset` is not handled there.

After Socket.IO and two-user role confirmation work, verify deal tables against the latest database, centralize the fee policy (≤$50: 0.5%; $51–$250: $1; >$250: 1%), finish amount negotiation, integrate Bakong verification with duplicate/failure protection, then complete history, disputes, authorization, tests, and deployment. This application currently tracks escrow states; it does not hold or release real bank funds.

## Development Protocol

Before editing, inspect the actual files and trace UI → API → database → Socket.IO → UI. State the exact file, function/block, and reason for each proposed change. Work on one file or tightly connected feature at a time; do not redesign unrelated code. Unless the user explicitly authorizes direct edits, present the patch for review first. After each change, give focused test instructions before proceeding.

For protected HTTP routes and Socket.IO joins, never trust a client-supplied `user_id` alone. Authenticate the request, verify room membership, validate inputs, and avoid exposing credentials or KYC uploads. Keep database host/port settings consistent; the current local configuration uses PostgreSQL port `3319`.

## Commands and Verification

From `Frontend/`, use `npm run dev`, `npm run lint`, and `npm run build`. Start Flask with `cd Backend/myproject/p2p_deal_app && python app.py`. No reliable automated suite or coverage threshold exists yet, so manually test affected APIs and real-time flows. Two-user tests require separate browsers, an incognito session, or separate profiles because normal tabs share `localStorage`.

Use PascalCase for React components, camelCase for JavaScript functions, and snake_case for Python. Keep API calls in frontend library modules and reuse `Frontend/src/lib/socket.js`. Never commit `.env`, passwords, API tokens, virtual environments, `node_modules`, build output, or uploaded identity files.

# P2P Escrow Development Protocol

Before changing code:

1. State the exact file name.
2. Identify the exact block or function being changed.
3. Explain why the change is required.
4. Change one file or one connected feature at a time.
5. Provide testing instructions before moving forward.
6. Inspect the actual code and trace the data flow before suggesting fixes.
7. Do not redesign unrelated parts of the project.
8.Do not change by your own. Generate code, show me and let me copy to paste myself

## Socket.IO Rule

Important deal actions must update affected users in real time.

When database data changes:

1. Determine every affected user_id.
2. Emit an event to each personal Socket.IO room:
   user_<user_id>
3. The receiving frontend page must reload the latest data from the API.
4. PostgreSQL and API responses remain the source of truth.
5. Socket.IO events signal that data changed; they should not replace persistent database state.

## Architecture

room.py owns:
- room creation
- invitations
- reminders
- room information

deal.py owns:
- role selection
- role confirmation
- amount negotiation
- payment
- release
- disputes
- completion

Build and test one feature at a time.
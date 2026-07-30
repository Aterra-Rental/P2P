from flask import Blueprint, request, jsonify

# Create the Flask Blueprint
room_bp = Blueprint('room', __name__)

# In-memory storage for local dev testing
ROOMS_DB = {}
MESSAGES_DB = {}


@room_bp.route('/rooms', methods=['GET', 'POST'])
def create_room():
    """
    GET: List rooms or filter by user_id
    POST: Create a new room
    """
    if request.method == 'GET':
        user_id = request.args.get('user_id')  # Flask query parameter
        rooms = list(ROOMS_DB.values())
        if user_id:
            rooms = [
                r for r in rooms 
                if str(r.get('created_by')) == str(user_id) or str(r.get('partner_user_id')) == str(user_id)
            ]
        return jsonify(rooms), 200

    elif request.method == 'POST':
        data = request.get_json() or {}
        room_code = data.get('room_code')
        if not room_code:
            return jsonify({'error': 'room_code is required'}), 400

        ROOMS_DB[room_code] = data
        MESSAGES_DB[room_code] = []
        return jsonify({'success': True, 'room': data}), 201


@room_bp.route('/rooms/<room_code>', methods=['GET', 'PATCH', 'DELETE'])
def get_room(room_code):
    """
    GET: Fetch details of a single room
    PATCH: Update room status or assign buyer/seller roles
    DELETE: Cancel and remove a room
    """
    room = ROOMS_DB.get(room_code)

    if request.method == 'GET':
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        return jsonify(room), 200

    elif request.method == 'PATCH':
        data = request.get_json() or {}
        if not room:
            # If room isn't in memory yet, initialize it
            ROOMS_DB[room_code] = {'room_code': room_code}
            room = ROOMS_DB[room_code]

        room.update(data)
        return jsonify({'success': True, 'room': room}), 200

    elif request.method == 'DELETE':
        if room_code in ROOMS_DB:
            del ROOMS_DB[room_code]
        if room_code in MESSAGES_DB:
            del MESSAGES_DB[room_code]
        return jsonify({'success': True}), 200


@room_bp.route('/messages', methods=['GET', 'POST'])
@room_bp.route('/messages/<room_code>', methods=['GET', 'POST'])
def get_messages(room_code=None):
    """
    GET: Retrieve all messages for a room code
    POST: Save a new message
    """
    if request.method == 'GET':
        target_code = room_code or request.args.get('room_code')
        if not target_code:
            return jsonify({'error': 'room_code required'}), 400
        
        messages = MESSAGES_DB.get(target_code, [])
        return jsonify(messages), 200

    elif request.method == 'POST':
        data = request.get_json() or {}
        target_code = room_code or data.get('room_code')

        if not target_code:
            return jsonify({'error': 'room_code is required'}), 400

        if target_code not in MESSAGES_DB:
            MESSAGES_DB[target_code] = []

        new_msg = {
            'id': len(MESSAGES_DB[target_code]) + 1,
            'sender_id': data.get('sender_id'),
            'text': data.get('text'),
            'kind': data.get('kind', 'mine'),
        }

        MESSAGES_DB[target_code].append(new_msg)
        return jsonify({'success': True, 'message': new_msg}), 201
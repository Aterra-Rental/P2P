from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# In-memory storage for local dev testing
# (If using Django Models, replace these dictionaries with Model queries)
ROOMS_DB = {}
MESSAGES_DB = {}


@api_view(['GET', 'POST'])
def create_room(request):
    """
    GET: List rooms or filter by user_id
    POST: Create a new room
    """
    if request.method == 'GET':
        user_id = request.query_params.get('user_id')
        rooms = list(ROOMS_DB.values())
        if user_id:
            rooms = [
                r for r in rooms 
                if str(r.get('created_by')) == str(user_id) or str(r.get('partner_user_id')) == str(user_id)
            ]
        return Response(rooms, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        room_code = data.get('room_code')
        if not room_code:
            return Response({'error': 'room_code is required'}, status=status.HTTP_400_BAD_REQUEST)

        ROOMS_DB[room_code] = data
        MESSAGES_DB[room_code] = []
        return Response({'success': True, 'room': data}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
def get_room(request, room_code):
    """
    GET: Fetch details of a single room
    PATCH: Update room status or assign buyer/seller roles
    DELETE: Cancel and remove a room
    """
    room = ROOMS_DB.get(room_code)

    if request.method == 'GET':
        if not room:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(room, status=status.HTTP_200_OK)

    elif request.method == 'PATCH':
        if not room:
            # If room isn't in memory yet, initialize it
            ROOMS_DB[room_code] = {'room_code': room_code}
            room = ROOMS_DB[room_code]

        room.update(request.data)
        return Response({'success': True, 'room': room}, status=status.HTTP_200_OK)

    elif request.method == 'DELETE':
        if room_code in ROOMS_DB:
            del ROOMS_DB[room_code]
        if room_code in MESSAGES_DB:
            del MESSAGES_DB[room_code]
        return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def get_messages(request, room_code=None):
    """
    GET: Retrieve all messages for a room code
    POST: Save a new message
    """
    if request.method == 'GET':
        if not room_code:
            return Response({'error': 'room_code required'}, status=status.HTTP_400_BAD_REQUEST)
        
        messages = MESSAGES_DB.get(room_code, [])
        return Response(messages, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        target_code = room_code or data.get('room_code')

        if not target_code:
            return Response({'error': 'room_code is required'}, status=status.HTTP_400_BAD_REQUEST)

        if target_code not in MESSAGES_DB:
            MESSAGES_DB[target_code] = []

        new_msg = {
            'id': len(MESSAGES_DB[target_code]) + 1,
            'sender_id': data.get('sender_id'),
            'text': data.get('text'),
            'kind': data.get('kind', 'mine'),
        }

        MESSAGES_DB[target_code].append(new_msg)
        return Response({'success': True, 'message': new_msg}, status=status.HTTP_201_CREATED)
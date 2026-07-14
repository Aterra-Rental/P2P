import json
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from .models import UserToken

@csrf_exempt
def register(request):
    data = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")
    email = data.get("email", "")

    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "username taken"}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    token = UserToken.objects.create(user=user, token=UserToken.generate())

    return JsonResponse({"token": token.token, "username": user.username}, status=201)


@csrf_exempt
def login_view(request):
    data = json.loads(request.body)
    username = data.get("username")
    password = data.get("password")

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse({"error": "invalid credentials"}, status=401)

    token, _ = UserToken.objects.get_or_create(user=user, defaults={"token": UserToken.generate()})

    return JsonResponse({"token": token.token, "username": user.username})


def profile(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JsonResponse({"error": "missing token"}, status=401)

    token_str = auth_header.split(" ")[1]
    try:
        user_token = UserToken.objects.get(token=token_str)
    except UserToken.DoesNotExist:
        return JsonResponse({"error": "invalid token"}, status=401)

    user = user_token.user
    return JsonResponse({
        "username": user.username,
        "email": user.email,
        "phone": ""
    })
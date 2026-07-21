import json
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from .models import UserToken

from .models import UserToken, Deal

def get_user_from_token(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token_str = auth_header.split(" ")[1]
    try:
        return UserToken.objects.get(token=token_str).user
    except UserToken.DoesNotExist:
        return None


def user_deals(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({"error": "unauthorized"}, status=401)

    deals = Deal.objects.filter(buyer=user) | Deal.objects.filter(seller=user)
    deals = deals.order_by('-created_at')

    return JsonResponse([d.to_dict() for d in deals], safe=False)


@csrf_exempt
def create_deal(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({"error": "unauthorized"}, status=401)

    data = json.loads(request.body)
    seller_username = data.get("seller_username")
    item_name = data.get("item_name")
    price = data.get("price")

    try:
        seller = User.objects.get(username=seller_username)
    except User.DoesNotExist:
        return JsonResponse({"error": "seller not found"}, status=404)

    deal = Deal.objects.create(buyer=user, seller=seller, item_name=item_name, price=price)
    return JsonResponse(deal.to_dict(), status=201)


@csrf_exempt
def update_deal_status(request, deal_id):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({"error": "unauthorized"}, status=401)

    data = json.loads(request.body)
    new_status = data.get("status")

    try:
        deal = Deal.objects.get(id=deal_id)
    except Deal.DoesNotExist:
        return JsonResponse({"error": "deal not found"}, status=404)

    if user not in (deal.buyer, deal.seller):
        return JsonResponse({"error": "not your deal"}, status=403)

    deal.status = new_status
    deal.save()
    return JsonResponse(deal.to_dict())


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
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from users.models import UserToken
from .models import Deal

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
        return JsonResponse({"error": "invalid or missing token"}, status=401)

    deals = Deal.objects.filter(buyer=user) | Deal.objects.filter(seller=user)
    deals = deals.order_by('-created_at')

    data = [
        {
            "id": d.id,
            "item_name": d.item_name,
            "price": str(d.price),
            "status": d.status,
        }
        for d in deals
    ]
    return JsonResponse(data, safe=False)


@csrf_exempt
def create_deal(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    buyer = get_user_from_token(request)
    if buyer is None:
        return JsonResponse({"error": "invalid or missing token"}, status=401)

    data = json.loads(request.body)
    seller_username = data.get("seller_username")
    item_name = data.get("item_name")
    price = data.get("price")

    if not all([seller_username, item_name, price]):
        return JsonResponse({"error": "missing fields"}, status=400)

    try:
        seller = User.objects.get(username=seller_username)
    except User.DoesNotExist:
        return JsonResponse({"error": "seller not found"}, status=404)

    if seller == buyer:
        return JsonResponse({"error": "buyer and seller must be different"}, status=400)

    deal = Deal.objects.create(
        buyer=buyer,
        seller=seller,
        item_name=item_name,
        price=price,
        status='pending'
    )

    return JsonResponse({
        "id": deal.id,
        "item_name": deal.item_name,
        "price": str(deal.price),
        "status": deal.status
    }, status=201)

@csrf_exempt
def update_deal_status(request, deal_id):
    if request.method != "PATCH":
        return JsonResponse({"error": "PATCH only"}, status=405)

    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({"error": "invalid or missing token"}, status=401)

    try:
        deal = Deal.objects.get(id=deal_id)
    except Deal.DoesNotExist:
        return JsonResponse({"error": "deal not found"}, status=404)

    if user != deal.buyer and user != deal.seller:
        return JsonResponse({"error": "not part of this deal"}, status=403)

    data = json.loads(request.body)
    new_status = data.get("status")
    valid_statuses = ["pending", "active", "completed", "cancelled"]
    if new_status not in valid_statuses:
        return JsonResponse({"error": f"status must be one of {valid_statuses}"}, status=400)

    deal.status = new_status
    deal.save()

    return JsonResponse({"id": deal.id, "status": deal.status})
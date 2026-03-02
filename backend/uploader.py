from PIL import Image
from io import BytesIO
import requests
import time
import os
import base64
from dotenv import load_dotenv

load_dotenv()


# ============================================
# SHOPIFY GRAPHQL CLASS
# ============================================

class ShopifyImageUploader:
    def __init__(self, shop_domain: str, token: str, api_version="2024-10"):
        self.endpoint = f"https://{shop_domain}/admin/api/{api_version}/graphql.json"
        self.headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token
        }

    def _graphql(self, query: str, variables: dict):
        response = requests.post(
            self.endpoint,
            json={"query": query, "variables": variables},
            headers=self.headers,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()

        if "errors" in result:
            raise Exception(result["errors"])

        return result


    # =========================
    # GET PRODUCTS
    # =========================
    def get_products(self):
        query = """
        {
          products(first: 50) {
            edges {
              node {
                id
                title
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
              }
            }
          }
        }
        """
        result = self._graphql(query, {})
        return result["data"]["products"]["edges"]


    # =========================
    # GET PRODUCT IMAGE
    # =========================
    def get_product_image(self, product_gid: str):
        query = """
        query($id: ID!) {
          product(id: $id) {
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
        """
        result = self._graphql(query, {"id": product_gid})
        edges = result["data"]["product"]["images"]["edges"]

        if not edges:
            raise Exception("No image found")

        return edges[0]["node"]["url"]


    # =========================
    # GET MEDIA IDS
    # =========================
    def get_product_media_ids(self, product_gid: str):
        query = """
        query($id: ID!) {
          product(id: $id) {
            media(first: 20) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
        """
        result = self._graphql(query, {"id": product_gid})
        edges = result["data"]["product"]["media"]["edges"]
        return [edge["node"]["id"] for edge in edges]


    # =========================
    # DELETE MEDIA
    # =========================
    def delete_product_media(self, product_gid: str, media_ids: list):
        if not media_ids:
            return True

        mutation = """
        mutation($productId: ID!, $mediaIds: [ID!]!) {
            productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
                deletedMediaIds
                userErrors { message }
            }
        }
        """

        variables = {
            "productId": product_gid,
            "mediaIds": media_ids
        }

        result = self._graphql(mutation, variables)
        data = result["data"]["productDeleteMedia"]

        if data["userErrors"]:
            raise Exception(data["userErrors"])

        return True


    # =========================
    # REQUEST UPLOAD TARGET
    # =========================
    def request_upload_target(self, filename: str):
        mutation = """
        mutation($input:[StagedUploadInput!]!){
            stagedUploadsCreate(input:$input){
                stagedTargets{
                    url
                    resourceUrl
                }
                userErrors{ message }
            }
        }
        """

        variables = {
            "input": [{
                "resource": "IMAGE",
                "filename": filename,
                "mimeType": "image/jpeg",
                "httpMethod": "PUT"
            }]
        }

        result = self._graphql(mutation, variables)
        data = result["data"]["stagedUploadsCreate"]

        if data["userErrors"]:
            raise Exception(data["userErrors"])

        return data["stagedTargets"][0]


    # =========================
    # ATTACH TO PRODUCT
    # =========================
    def attach_to_product(self, product_gid: str, resource_url: str):
        mutation = """
        mutation($productId:ID!, $media:[CreateMediaInput!]!){
            productCreateMedia(productId:$productId, media:$media){
                mediaUserErrors { message }
            }
        }
        """

        variables = {
            "productId": product_gid,
            "media": [{
                "originalSource": resource_url,
                "mediaContentType": "IMAGE"
            }]
        }

        result = self._graphql(mutation, variables)
        data = result["data"]["productCreateMedia"]

        if data["mediaUserErrors"]:
            raise Exception(data["mediaUserErrors"])

        return True


# ============================================
# IMAGE RESIZE LOGIC
# ============================================

def build_resized_image(img: Image.Image, width: int, height: int) -> BytesIO:
    img = img.convert("RGBA")

    img.thumbnail((width, height), Image.LANCZOS)

    background = Image.new("RGB", (width, height), (255, 255, 255))

    position = (
        (width - img.width) // 2,
        (height - img.height) // 2
    )

    background.paste(img, position, img)

    buffer = BytesIO()
    background.save(buffer, format="JPEG", quality=85)
    buffer.seek(0)

    return buffer


# ============================================
# PREVIEW FUNCTION
# ============================================

def preview_product_image(product_id: str, width: int, height: int):
    SHOP = os.getenv("SHOPIFY_SHOP")
    TOKEN = os.getenv("SHOPIFY_TOKEN")

    uploader = ShopifyImageUploader(SHOP, TOKEN)
    product_gid = f"gid://shopify/Product/{product_id}"

    image_url = uploader.get_product_image(product_gid)

    response = requests.get(image_url, timeout=30)
    response.raise_for_status()
    img = Image.open(BytesIO(response.content))

    original_w, original_h = img.size

    resized_buffer = build_resized_image(img, width, height)
    resized_img = Image.open(resized_buffer)
    resized_w, resized_h = resized_img.size

    encoded = base64.b64encode(resized_buffer.getvalue()).decode("utf-8")

    return {
        "original_url": image_url,
        "original_size": f"{original_w}x{original_h}",
        "resized_size": f"{resized_w}x{resized_h}",
        "preview_image": f"data:image/jpeg;base64,{encoded}"
    }


# ============================================
# CONFIRM REPLACE FUNCTION
# ============================================

def resize_product_image(product_id: str, width: int, height: int):
    SHOP = os.getenv("SHOPIFY_SHOP")
    TOKEN = os.getenv("SHOPIFY_TOKEN")

    uploader = ShopifyImageUploader(SHOP, TOKEN)
    product_gid = f"gid://shopify/Product/{product_id}"

    try:
        # Get image
        image_url = uploader.get_product_image(product_gid)
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()

        img = Image.open(BytesIO(response.content))
        image_data = build_resized_image(img, width, height)

        # Delete old media
        try:
            media_ids = uploader.get_product_media_ids(product_gid)
            if media_ids:
                uploader.delete_product_media(product_gid, media_ids)
                time.sleep(1)
        except Exception as delete_error:
            print("Delete skipped:", delete_error)

        # Upload new image
        target = uploader.request_upload_target("resized.jpg")

        upload_response = requests.put(
            target["url"],
            data=image_data.getvalue(),
            headers={"Content-Type": "image/jpeg"},
            timeout=60
        )
        upload_response.raise_for_status()

        time.sleep(1)

        uploader.attach_to_product(product_gid, target["resourceUrl"])

        return {"status": "success"}

    except Exception as e:
        return {"status": "error", "message": str(e)}


# ============================================
# GET PRODUCTS WRAPPER
# ============================================

def get_products():
    SHOP = os.getenv("SHOPIFY_SHOP")
    TOKEN = os.getenv("SHOPIFY_TOKEN")

    uploader = ShopifyImageUploader(SHOP, TOKEN)
    return uploader.get_products()
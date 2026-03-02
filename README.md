# 🖼️ Shopify Image Optimization Tool

A full-stack Shopify image resizing and optimization tool built using **React (Frontend)** and **FastAPI (Backend)**.

This application allows users to preview, resize, and replace Shopify product images individually or in bulk while maintaining image quality and aspect ratio.

---

## 🚀 Features

- 📦 Fetch Shopify products
- 🔍 Preview resized image before replacing
- 📐 Multiple resize options (1000x1000, 1080x1080, 1200x1200, Custom)
- 🔄 Replace original Shopify image
- 🔥 Bulk resize selected or all products
- 📊 Progress tracking for bulk operations
- ✅ Success and failure reporting

---

## 🏗️ Architecture

React Frontend  →  FastAPI Backend  →  Shopify Admin GraphQL API

- **Frontend (React)**
  - Built with functional components
  - State management using `useState`
  - Lifecycle handling using `useEffect`
  - Async API calls using `fetch`
  - Conditional rendering for preview & loading states

- **Backend (FastAPI)**
  - Integrates with Shopify Admin GraphQL API
  - Downloads product images
  - Resizes images using Pillow
  - Provides preview endpoint
  - Replaces image after confirmation

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript (ES6+)
- HTML & CSS

### Backend
- FastAPI
- Python
- Pillow (Image Processing)
- Shopify GraphQL API

---

## ⚙️ How It Works

### 1️⃣ Fetch Products
When user opens the products page:

GET /products

Backend fetches products from Shopify and returns them to frontend.

---

### 2️⃣ Preview Resize

POST /preview/{product_id}

- Downloads original image
- Resizes it based on selected dimensions
- Returns preview without modifying Shopify

---

### 3️⃣ Confirm Replace

POST /confirm/{product_id}

- Resizes the image
- Replaces the original Shopify image
- Refreshes product list

---

### 4️⃣ Bulk Resize
- Processes multiple products concurrently
- Tracks progress
- Returns success and failure count

---

## 📐 Image Processing Strategy

- Maintains aspect ratio
- Avoids distortion
- Uses high-quality interpolation
- Minimizes blur when resizing
- Avoids unnecessary upscaling

---

## 🔧 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
2️⃣ Frontend Setup
cd frontend
npm install
npm start

Runs on:

http://localhost:3000
3️⃣ Backend Setup
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

Runs on:

http://127.0.0.1:8000
🔐 Environment Variables (Backend)

Create a .env file:

SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
📚 What I Learned

Managing complex state with React Hooks

Handling async bulk operations

Working with Shopify GraphQL API

Implementing preview-before-confirm workflow

Backend image processing & optimization

👨‍💻 Author

Rohit
Full Stack Developer
React | FastAPI | Shopify API | Image Processing

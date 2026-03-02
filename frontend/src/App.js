import React, { useEffect, useState } from "react";

function App() {
  const [view, setView] = useState("home");
  const [products, setProducts] = useState([]);
  const [loadingProduct, setLoadingProduct] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewProductId, setPreviewProductId] = useState(null);

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkResult, setBulkResult] = useState(null);
  const [resizeOption, setResizeOption] = useState("1000");
  const [selectedWidth, setSelectedWidth] = useState(1000);
  const [selectedHeight, setSelectedHeight] = useState(1000);

  useEffect(() => {
    if (view === "products") {
      fetch("http://127.0.0.1:8000/products")
        .then((res) => res.json())
        .then((data) => setProducts(data))
        .catch((err) => console.error(err));
    }
  }, [view]);

  const refreshProducts = () => {
    fetch("http://127.0.0.1:8000/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  };


  const handleResizeChange = (value) => {
    setResizeOption(value);

    if (value === "1000") {
      setSelectedWidth(1000);
      setSelectedHeight(1000);
    } else if (value === "1080") {
      setSelectedWidth(1080);
      setSelectedHeight(1080);
    } else if (value === "1200") {
      setSelectedWidth(1200);
      setSelectedHeight(1200);
    }
  };


  const toggleProductSelection = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

 
  const previewProduct = async (productId) => {
    const numericId = productId.split("/").pop();
    setLoadingProduct(productId);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/preview/${numericId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            width: selectedWidth,
            height: selectedHeight,
          }),
        }
      );

      const data = await res.json();
      setPreviewData(data);
      setPreviewProductId(productId);
    } catch (error) {
      alert("Preview failed");
    }

    setLoadingProduct(null);
  };


  const confirmResize = async () => {
    const numericId = previewProductId.split("/").pop();
    setLoadingProduct(previewProductId);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/confirm/${numericId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            width: selectedWidth,
            height: selectedHeight,
          }),
        }
      );

      const data = await res.json();

      if (data.status === "success") {
        alert("Image replaced successfully 🚀");
        setPreviewData(null);
        setPreviewProductId(null);
        refreshProducts();
      } else {
        alert("Error: " + data.message);
      }
    } catch {
      alert("Something went wrong");
    }

    setLoadingProduct(null);
  };


  const runBulkResize = async (productIds) => {
    if (productIds.length === 0) {
      alert("No products selected.");
      return;
    }

    setBulkLoading(true);
    setBulkProgress(0);
    setBulkTotal(productIds.length);
    setBulkResult(null);

    let success = 0;
    let failed = 0;

    const promises = productIds.map(async (id) => {
      const numericId = id.split("/").pop();

      try {
        const res = await fetch(
          `http://127.0.0.1:8000/confirm/${numericId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              width: selectedWidth,
              height: selectedHeight,
            }),
          }
        );

        const data = await res.json();

        if (data.status === "success") success++;
        else failed++;
      } catch {
        failed++;
      }

      setBulkProgress((prev) => prev + 1);
    });

    await Promise.all(promises);

    setBulkResult({ success, failed });
    setBulkLoading(false);
    setSelectedProducts([]);
    refreshProducts();
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* SIDEBAR */}
      <div style={{ width: "250px", background: "#111", color: "white", padding: "20px" }}>
        <h2>Dashboard</h2>
        <button
          onClick={() => setView("products")}
          style={{ width: "100%", padding: "10px", marginTop: "20px", cursor: "pointer" }}
        >
          Products
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {view === "home" && <h1>Welcome to Shopify Image Tool</h1>}

        {view === "products" && (
          <>
            <h1>Products List</h1>

            {/* Resize Dropdown */}
            <div style={{ marginBottom: "20px" }}>
              <h3>Resize Options (Professional Mode)</h3>

              <select
                value={resizeOption}
                onChange={(e) => handleResizeChange(e.target.value)}
                style={{ padding: "10px", marginRight: "20px" }}
              >
                <option value="1000">1000x1000 (Square)</option>
                <option value="1080">1080x1080</option>
                <option value="1200">1200x1200 (Shopify Recommended)</option>
                <option value="custom">Custom</option>
              </select>

              {resizeOption === "custom" && (
                <>
                  <input
                    type="number"
                    placeholder="Width"
                    value={selectedWidth}
                    onChange={(e) => setSelectedWidth(Number(e.target.value))}
                    style={{ padding: "8px", marginRight: "10px" }}
                  />
                  <input
                    type="number"
                    placeholder="Height"
                    value={selectedHeight}
                    onChange={(e) => setSelectedHeight(Number(e.target.value))}
                    style={{ padding: "8px" }}
                  />
                </>
              )}
            </div>

            {/* BULK BUTTONS */}
            <div style={{ marginBottom: "20px" }}>
              <button onClick={() => runBulkResize(selectedProducts)} disabled={bulkLoading} style={{ padding: "10px", marginRight: "15px" }}>
                {bulkLoading ? "Processing..." : "Resize Selected"}
              </button>

              <button onClick={() => runBulkResize(products.map((p) => p.node.id))} disabled={bulkLoading} style={{ padding: "10px" }}>
                {bulkLoading ? "Processing..." : "Resize All"}
              </button>
            </div>

            {/* PRODUCT LIST */}
            {products.map((p) => {
              const numericId = p.node.id.split("/").pop();
              const isLoading = loadingProduct === p.node.id;

              return (
                <div key={p.node.id} style={{ border: "1px solid #ddd", padding: "20px", marginBottom: "20px", borderRadius: "10px" }}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.node.id)}
                    onChange={() => toggleProductSelection(p.node.id)}
                  />

                  <h3>{p.node.title}</h3>
                  <p><strong>Product ID:</strong> {numericId}</p>

                  {p.node.images.edges[0] && (
                    <img src={p.node.images.edges[0].node.url} width="150" alt="" />
                  )}

                  <br /><br />

                  <button onClick={() => previewProduct(p.node.id)} disabled={isLoading}>
                    {isLoading ? "Processing..." : "Resize Image"}
                  </button>

                  {previewProductId === p.node.id && previewData && (
                    <div style={{ marginTop: "20px" }}>
                      <h4>Before vs After</h4>
                      <p>{previewData.original_size} → {previewData.resized_size}</p>

                      <div style={{ display: "flex", gap: "30px" }}>
                        <div>
                          <h5>Original</h5>
                          <img src={previewData.original_url} width="200" alt="" />
                        </div>
                        <div>
                          <h5>Resized Preview</h5>
                          <img src={previewData.preview_image} width="200" alt="" />
                        </div>
                      </div>

                      <br />

                      <button onClick={confirmResize} style={{ padding: "10px 20px", background: "green", color: "white", border: "none" }}>
                        Confirm Replace
                      </button>

                      <button onClick={() => { setPreviewData(null); setPreviewProductId(null); }} style={{ padding: "10px 20px", marginLeft: "15px" }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
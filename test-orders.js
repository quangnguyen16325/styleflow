import axios from "axios";

async function run() {
  try {
    const loginRes = await axios.post("http://localhost:5000/auth/login", {
      email: "nguyenvana@example.com",
      password: "secretpassword123",
    });
    console.log("Logged in. Token:", loginRes.data.token ? "YES" : "NO");

    const ordersRes = await axios.get("http://localhost:5000/orders", {
      headers: { Authorization: `Bearer ${loginRes.data.token}` },
    });
    console.log("GET /orders => status:", ordersRes.status);
  } catch (err) {
    console.error(
      "Error:",
      err.response ? err.response.status + " " + JSON.stringify(err.response.data) : err.message,
    );
  }
}
run();

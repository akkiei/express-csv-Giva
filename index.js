const express = require("express");
const app = express();
const port = "3000";
const indexRoute = require("./routes/index");

app.use(express.json());
app.use(express.urlencoded());

app.use("/", indexRoute);
// app.use("/upload", indexRoute);
// app.use("/download", indexRoute);
// app.use("/akash", indexRoute);

app.listen(port, () => {
  console.log("Listening on PORT" + port);
});

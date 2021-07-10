const express = require("express");
const router = express.Router();
// const CsvService = require("../services/index");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "uploadedCSV/" });
const UploadService = require("../services/index");
const csv = require("fast-csv");
const fs = require("fs");

router.get("/", (req, res) => {
  // serve html page
  res.sendFile(path.join(__dirname, "../views/index.html"));
});

router.get("/akash", (req, res) => {});

router.post("/upload", upload.single("myFile"), async (req, res) => {
  const UploadServiceObj = new UploadService();
  const result = await UploadServiceObj.processCSV(req.file.path);

  const { data, failedPin, successPin } = result;
  console.log("results in routes");
  const dateTime = new Date().toISOString();
  const filePath = `/${dateTime}-${successPin}-${failedPin}.csv`;
  fs.writeFileSync(path.join(__dirname, "../uploadedCSV", filePath), "");
  csv.writeToPath(path.join(__dirname, "../uploadedCSV", filePath), data);

  res.send({
    fileName: `${dateTime}-${successPin}-${failedPin}.csv`,
  });
});

router.get("/download/:fileName", async (req, res) => {
  console.log(req.params.fileName);
  const filePath = req.params.fileName;
  const fileData = fs.readFileSync(
    path.join(__dirname, "../uploadedCSV/", filePath)
  );
  res.writeHead(200, {
    "Content-Disposition": `attachment; filename="${filePath}"`,
    "Content-Type": "text/plain",
  });
  const download = Buffer.from(fileData, "base64");
  res.end(download);
  fs.unlinkSync(path.join(__dirname, "../uploadedCSV", filePath));
});

module.exports = router;

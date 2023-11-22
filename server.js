const express = require("express");
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto'); // Import the crypto module

var app = express();
app.use(cors()); // Allows incoming requests from any IP

const uploadFolder = path.join(__dirname, '/uploads');
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, __dirname + '/uploads');
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});

// Set saved storage options:
const upload = multer({ storage: storage });

app.post("/uploads", upload.array("files"), (req, res) => {
    console.log(req.body); // Logs form body values
    console.log(req.files); // Logs any files

    // Signing the uploaded file
    const privateKey = crypto.generateKeyPairSync('ec', {
        namedCurve: 'secp256k1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey;

    const files = req.files;
    const file = files[0];
    const fileContent = fs.readFileSync(file.path);

    const sign = crypto.createSign('SHA256');
    sign.write(fileContent);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');

    // Respond with the signature
    res.json({ message: "File(s) uploaded and signed successfully", signature: signature });
});

// Endpoint to download the uploaded file
app.get("/download/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadFolder, filename);

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
    }

    // Send the file as a response
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({ error: 'Error downloading file' });
        }
    });
});

app.get("/list-files", (req, res) => {
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            res.status(500).json({ error: 'Error reading directory' });
            return;
        }
        res.json({ files: files });
    });
});

app.listen(5000, function () {
    console.log("Server running on port 5000");
});
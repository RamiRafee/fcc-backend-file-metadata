var express = require('express');
var cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config()

var app = express();

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define a Mongoose model for storing file information
const File = mongoose.model('File', {
  fileId: String,
  filename: String,
  type: String,
  size: Number,
  content: Buffer // Store the file content as Buffer
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to fetch all files data (excluding buffer content)
app.get('/api/files', async (req, res) => {
  try {
    const files = await File.find({}, { content: 0 }); // Exclude the 'content' field

    const filesData = files.map(file => ({
      fileId: file.fileId,
      filename: file.filename,
      type: file.type,
      size: file.size
    }));

    return res.json(filesData);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch files data' });
  }
});

app.post('/api/fileanalyse', upload.single('upfile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, mimetype, size, buffer } = req.file;
  // Generate a unique fileId
  const fileId = generateUniqueId();
  // Save file information to MongoDB
  try {
    const file = new File({
      fileId: fileId,
      filename: originalname,
      type: mimetype,
      size: size,
      content: buffer
    });

    await file.save();

    return res.json({
      name: originalname,
      type: mimetype,
      size: size
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save file information' });
  }
});

// Route to retrieve and serve the file content
app.get('/api/file/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Serve the file content
    res.setHeader('Content-Type', file.type);
    res.send(file.content);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve file content' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port)
});
function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}
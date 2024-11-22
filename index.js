const { Command } = require('commander');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs')

const program = new Command();
program
    .option('-h, --host <type>', 'server address')
    .option('-p, --port <number>', 'server port')
    .option('-c, --cache <path>', 'path to the cache directory');

program.parse(process.argv);
const options = program.opts();

const host = options.host;
const port = options.port;
const cache = options.cache;

if (!host || !port || !cache) {
    console.error('Error: required parameters not specified --host, --port and --cache.');
    process.exit(1);
}

const file = fs.readFileSync('./swagger.yaml', 'utf8')
const swaggerDocument = YAML.parse(file)
const app = express();
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
const upload = multer();

const cacheDir = path.resolve(options.cache);
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}


const getNotePath = (noteName) => path.join(cacheDir, `${noteName}.txt`);


app.get('/notes/:name', (req, res) => {
    const notePath = getNotePath(req.params.name);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    const noteText = fs.readFileSync(notePath, 'utf-8');
    res.send(noteText);
});


app.put('/notes/:name', (req, res) => {
    const notePath = getNotePath(req.params.name);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    fs.writeFileSync(notePath, req.body.text || '');
    res.send('Note updated');
});


app.delete('/notes/:name', (req, res) => {
    const notePath = getNotePath(req.params.name);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    fs.unlinkSync(notePath);
    res.send('Note deleted');
});


app.get('/notes', (req, res) => {
    const files = fs.readdirSync(cacheDir);
    const notes = files.map((file) => {
        const noteName = path.basename(file, '.txt');
        const noteText = fs.readFileSync(getNotePath(noteName), 'utf-8');
        return { name: noteName, text: noteText };
    });
    res.status(200).json(notes);
});

app.post('/write', upload.none(), (req, res) => {
    const { note_name, note } = req.body;
    const notePath = path.join(cacheDir, `${note_name}.txt`);

    if (fs.existsSync(notePath)) {
        return res.status(400).send('Note already exists');
    }
    fs.writeFile(notePath, note, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        res.status(201).send('Created');
    });
});


app.get('/UploadForm.html', (req, res) => {
    const uploadFormPath = path.join(__dirname, 'UploadForm.html');
    if (fs.existsSync(uploadFormPath)) {
        res.sendFile(uploadFormPath);
    } else {
        res.status(404).send('Upload form not found');
    }
});

app.listen(options.port, options.host, () => {
    console.log(`Server is running at http://${options.host}:${options.port}`);
    console.log(`Cache directory: ${options.cache}`);
});
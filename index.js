const { Command } = require('commander');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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

const app = express();
//дозволяє серверу автоматично обробляти вхідні запити з тілом у форматі JSON
app.use(express.json());
//Ініціалізує об’єкт Multer для обробки даних у форматі multipart/form-data
const upload = multer();

const cacheDir = path.resolve(options.cache);
if (!fs.existsSync(cacheDir)) {
    //дозволяє створити весь шлях до каталогу, навіть якщо немає проміжних каталогів.
    fs.mkdirSync(cacheDir, { recursive: true });
}


const getNotePath = (noteName) => path.join(cacheDir, `${noteName}.txt`);


app.get('/notes/:name', (req, res) => {
    //req.params.name містить значення :name із запиту
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
    //req.body.text це текстовий вміст
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
    //Зчитує всі файли з директорії
    const files = fs.readdirSync(cacheDir);
    const notes = files.map((file) => {
        //видаляє розширення .txt із назви файлу
        const noteName = path.basename(file, '.txt');
        const noteText = fs.readFileSync(getNotePath(noteName), 'utf-8');
        return { name: noteName, text: noteText };
    });
    res.status(200).json(notes);
});

//метод з бібліотеки multer, який вказує, що сервер очікує тільки текстові дані в тілі запиту
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
    //вбудована змінна, яка містить абсолютний шлях до директорії
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
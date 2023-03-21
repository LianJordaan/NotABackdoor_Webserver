const express = require("express");
const pako = require("pako");
const bodyParser = require("body-parser");
const session = require("express-session");
const zlib = require("zlib");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = 3000;

module.exports = app;

// Set the views directory and view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: true,
	})
);

// Add a route to accept POST requests from the Minecraft plugin

app.get("/server", (req, res) => {
	res.redirect("/servers");
});

app.get("/servers", (req, res) => {
	let serverDir = "./.data/servers/";
	let files = fs.readdirSync(serverDir);
	let servers = files
		.filter((file) => {
			return file.endsWith(".txt");
		})
		.map((file) => {
			return file.replace(".txt", "");
		});
	let html = "<html><body><ul>";
	servers.forEach((server) => {
		html += `<li><a href='./server/${server}'>${server}</a></li>`;
	});
	html += "</ul></body></html>";
	res.send(html);
});

app.get("/server/:name", (req, res) => {
	let serverDir = "./.data/servers/";
	let serverName = req.params.name;
	let serverFile = serverDir + serverName + ".txt";
	if (!fs.existsSync(serverFile)) {
		res.status(404).send("Server not found");
		return;
	}
	let serverData = fs.readFileSync(serverFile, "utf-8");
	let directory = JSON.parse(serverData);
	let minecraft = directory.find((item) => item.name === "minecraft");
	if (!minecraft) {
		res.status(404).send("Minecraft directory not found");
		return;
	}
	let html =
		`<html><body>` +
		fs.readFileSync("./.data/assests/fileprehtml", "utf8") +
		`<div style='display: flex; flex-direction: column;'>`;
	minecraft.contents.forEach((item) => {
		if (item.type === "directory" || item.type === "file") {
			html += `<div class="file">`;
			if (item.type === "directory") {
				html += fs.readFileSync("./.data/assests/foldericon", "utf8");
			}
			if (item.type === "file") {
				html += fs.readFileSync("./.data/assests/fileicon", "utf8");
			}
			html += `<a style='text-decoration: none;' href='./${serverName}/${item.name}'>${item.name}</a></div>`;
		}
	});
	html +=
		`</div></body>` +
		fs.readFileSync("./.data/assests/filecss", "utf8") +
		`<script>` +
		fs.readFileSync("./.data/assests/filejs", "utf8") +
		`</script>` +
		`</html>`;
	res.send(html);
});

app.get("/server/:name/*", (req, res) => {
	let serverDir = "./.data/servers/";
	let serverName = req.params.name;
	let serverFile = serverDir + serverName + ".txt";
	if (!fs.existsSync(serverFile)) {
		res.status(404).send("Server not found");
		return;
	}
	let serverData = fs.readFileSync(serverFile, "utf-8");
	serverData = JSON.parse(serverData);

	const pathSegments = req.params[0]
		.split("/")
		.map((segment) => decodeURIComponent(segment));
	let currentDir = serverData[0].path;
	let currentContents = serverData[0].contents;

	let tval;

	for (const segment of pathSegments) {
		const matchingItem = currentContents.find(
			(item) => item.name === segment && item.type === "directory"
		);
		const matchingItem1 = currentContents.find(
			(item) => item.name === segment && item.type === "file"
		);

		if (!matchingItem) {
			if (!matchingItem1) {
				res.status(404).send("Path not found");
				return;
			}
		}

		if (matchingItem1) {
			tval = matchingItem1;
			break;
		}

		if (!matchingItem1) {
			currentDir = path.join(currentDir, matchingItem.name);
			currentContents = matchingItem.contents;
		}
	}

	if (!tval) {
		let html =
			`<html><body>` +
			fs.readFileSync("./.data/assests/fileprehtml", "utf8") +
			`<div style='display: flex; flex-direction: column;'>`;
		currentContents.forEach((item) => {
			if (item.type === "directory" || item.type === "file") {
				html += `<div class="file">`;
				if (item.type === "directory") {
					html += fs.readFileSync(
						"./.data/assests/foldericon",
						"utf8"
					);
				}
				if (item.type === "file") {
					html += fs.readFileSync("./.data/assests/fileicon", "utf8");
				}
				html += `<a style='text-decoration: none;' href='./${
					pathSegments[pathSegments.length - 1]
				}/${item.name}'>${item.name}</a></div>`;
			}
		});
		html += `</div></body>` + fs.readFileSync("./.data/assests/filecss", "utf8") + `<script>` + fs.readFileSync("./.data/assests/filejs", "utf8") + `</script></html>`;
		res.send(html);
	} else if (tval) {
		if (currentDir === ".") {
			currentDir = "";
		}
		if (fs.existsSync(path.join("./.data/servers/", serverName, "/", currentDir, pathSegments[pathSegments.length - 1]))) {

			html = fs.readFileSync("./.data/assests/editor-html-1", "utf8");

			html += pathSegments[pathSegments.length - 1];

			html += fs.readFileSync("./.data/assests/editor-html-2", "utf8");
			html += fs.readFileSync(path.join("./.data/servers/", serverName, "/", currentDir, pathSegments[pathSegments.length - 1]), "utf8");
			html += fs.readFileSync("./.data/assests/editor-html-3", "utf8");
			html += `<style>` + fs.readFileSync("./.data/assests/editor-css", "utf8") + `</style>`;
			html += `<script>` + fs.readFileSync("./.data/assests/editor-js", "utf8") + `</script>`;

			res.send(html);
		} else {
			res.send(fs.readFileSync("./.data/assests/filenotready", "utf8"));
			const filePath = './.data/log.txt'; // replace with the path to your file
			const lineToAdd = path.join(currentDir, pathSegments[pathSegments.length - 1]);

			fs.readFile(filePath, 'utf8', (err, data) => {
			  if (err) {
			    console.error(err);
			    return;
			  }
		  
			  // Check if lineToAdd already exists in the file
			  if (data.includes(`${lineToAdd}\n`)) {
			    return;
			  }
		  
			  // Add the line to the file
			  fs.appendFile(filePath, `${lineToAdd}\n`, (err) => {
			    if (err) {
			      console.error(err);
			      return;
			    }
			  });
			});

		}
	}
});

app.post("/filesystem", (req, res) => {
	let body = "";

	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", () => {

		if (req.headers.type === "FileListUpdate") {
			let base64 = Buffer.from(body, "base64");
			let data = pako.ungzip(base64, { to: "string" });

			// Get the server header value
			let serverName = req.headers.server;

			// Create the path to the file
			let fileName = serverName + ".txt";
			let filePath = path.join("./.data/servers/", fileName);

			// Write the data to the file
			fs.writeFile(filePath, data, (err) => {
				if (err) {
					console.log(err);
				}
			});

			res.send(fs.readFileSync("./.data/log.txt", "utf8"));
		} else if (req.headers.type === "File") {

			let base64 = Buffer.from(body, "base64");
			let data = pako.ungzip(base64, { to: "string" });

			// Get the server header value
			let serverName = req.headers.server;
			let fileName = req.headers.file;

			// Create the path to the file
			let newfilePath = path.join("./.data/servers/", serverName, fileName);

			// Create all directories in the file path if they don't exist
			fs.mkdirSync(path.dirname(newfilePath), { recursive: true });

			// Write the data to the file
			fs.writeFile(newfilePath, data, (err) => {
			  if (err) {
			    console.log(err);
			  }
			});

			const filePath = "./.data/log.txt";
			fs.readFile(filePath, 'utf-8', (err, data) => {
			  if (err) {
			    console.error(err);
			    return;
			  }
		  
			  // Split the data into lines
			  const lines = data.split('\n');
		  
			  // Find the index of the line to remove
			  const lineIndex = lines.findIndex(line => line.trim() === fileName.replace(/\//g, "\\"));
		  
			  // If the line exists, remove it from the array
			  if (lineIndex !== -1) {
			    lines.splice(lineIndex, 1);
			  }
		  
			  // Write the updated data back to the file
			  fs.writeFile(filePath, lines.join('\n'), err => {
			    if (err) {
			      console.error(err);
			      return;
			    }
			  });
			});


			res.sendStatus(201);
			setTimeout(() => {
				try {
				  	fs.unlinkSync(newfilePath);
				} catch (error) {

				}
			}, 30000);
		} else {
			res.sendStatus(404);
		}
	});
});

function deleteEmptyDirs(path) {
  // Read the contents of the directory
  fs.readdir(path, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }

    // If directory is empty, delete it
    if (files.length === 0) {
      fs.rmdir(path, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log(`Deleted empty directory: ${path}`);
        }
      });
      return;
    }

    // Check subdirectories for emptiness
    files.forEach((file) => {
      if (file.isDirectory()) {
        const subPath = `${path}/${file.name}`;
        deleteEmptyDirs(subPath);
      }
    });
  });
}

setInterval(() => {
  // Start checking from the root directory
  const rootPath = "./";
  deleteEmptyDirs(rootPath);
}, 50);

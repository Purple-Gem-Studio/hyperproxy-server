const http = require('http')
const port = process.env.PORT || 24443
const net = require('net')
const url = require('url')

const requestHandler = (req, res) => { // discard all request to proxy server except HTTP/1.1 CONNECT method
  res.writeHead(405, {'Content-Type': 'text/plain'})
  res.end('Method not allowed')
}

const server = http.createServer(requestHandler)

const listener = server.listen(port, (err) => {
  if (err) {
    return console.error(err)
  }
  const info = listener.address()
  console.log(`Server is listening on address ${info.address} port ${info.port}`)
})

server.on('connect', (req, clientSocket, head) => { // listen only for HTTP/1.1 CONNECT method
  console.log(clientSocket.remoteAddress, clientSocket.remotePort, req.method, req.url)
//   if (!req.headers['proxy-authorization']) { // here you can add check for any username/password, I just check that this header must exist!
//     clientSocket.write([
//       'HTTP/1.1 407 Proxy Authentication Required',
//       'Proxy-Authenticate: Basic realm="proxy"',
//       'Proxy-Connection: close',
//     ].join('\r\n'))
//     clientSocket.end('\r\n\r\n')  // empty body
//     return
//   }
  const {port, hostname} = url.parse(`//${req.url}`, false, true) // extract destination host and port from CONNECT request
  if (hostname && port) {
	if (typeof hostname === 'string' && hostname.includes('google')) {
        clientSocket.end(`HTTP/1.1 500 Google is banned.\r\n`);
		console.log("Connection refused: Google was blocked for safety.");
	}

	const serverDataHandler = (data) => {
		// console.log('server:', data.toString());
		console.log('server: received data from', serverSocket.remoteAddress, hostname);
	}
    const serverErrorHandler = (err) => {
      console.error(err.message)
      if (clientSocket) {
        clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`)
      }
    }
    const serverEndHandler = () => {
      if (clientSocket) {
        clientSocket.end(`HTTP/1.1 500 Connection closed forcibly.\r\n`);
      }
    }
    const serverSocket = net.connect(port, hostname) // connect to destination host and port
	const clientDataHandler = (data) => {
		// console.log('client:', data.toString());
		console.log('client: received data from', serverSocket.remoteAddress, hostname);
	}
    const clientErrorHandler = (err) => {
      console.error(err.message)
      if (serverSocket) {
        serverSocket.end()
      }
    }
    const clientEndHandler = () => {
      if (serverSocket) {
        serverSocket.end()
      }
    }
    clientSocket.on('data', clientDataHandler)
    clientSocket.on('error', clientErrorHandler)
    clientSocket.on('end', clientEndHandler)
    serverSocket.on('data', serverDataHandler)
    serverSocket.on('error', serverErrorHandler)
    serverSocket.on('end', serverEndHandler)
    serverSocket.on('connect', () => {
      clientSocket.write([
        'HTTP/1.1 200 Connection Established',
        'Proxy-agent: Node-VPN',
      ].join('\r\n'))
      clientSocket.write('\r\n\r\n') // empty body
      // "blindly" (for performance) pipe client socket and destination socket between each other
      serverSocket.pipe(clientSocket, {end: false})
      clientSocket.pipe(serverSocket, {end: false})
    })
  } else {
    clientSocket.end('HTTP/1.1 400 Bad Request\r\n')
    clientSocket.destroy()
  }
})

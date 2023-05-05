# Introduction
### This is very much work in progress

This is a prototype VNC client (based on [noVNC](https://novnc.com/info.html)) that fully runs in the browser and uses tailscale wasm to connect to the remote computer.
The work is based on [my PR](https://github.com/tailscale/tailscale/pull/8047) to tailscale that adds TCP support to the tsconnect package.
Even tho [the PR](https://github.com/tailscale/tailscale/pull/8047) links to the [vnc branch](https://github.com/conblem/tailscale/tree/vnc) this uses the [working branch](https://github.com/conblem/tailscale/tree/working).
This is because the [vnc branch](https://github.com/conblem/tailscale/tree/vnc) is based on the [main develop branch](https://github.com/tailscale/tailscale) of tailscale which doesn't seem super stable.
I backported my changes to a stable tag of tailscale in the [working branch](https://github.com/conblem/tailscale/tree/working).

I am not ascoiated with tailscale in any way.

# Getting Started
First make sure to clone the tailscale submodule
```bash
git pull --recurse-submodules
```

Afterwards build the tsconnect package, for this you have to cd into the tailscale folder
```bash
cd tailscale
./tool/go run ./cmd/tsconnect build-pkg
```

Now you can start the server just like any other next.js project
```bash
npm install
npm run dev
```

To change the ip of your vnc server and the password edit the [index.tsx file](https://github.com/conblem/tailvnc/blob/main/pages/index.tsx) in the pages folder.
Once done open the browser and go to [localhost:3000](http://localhost:3000/) and open your console.
There should be a message saying "needsLogin" or something similiar, copy the url into a seperate tab and sign in with your tailscale account. 
If everything goes as planned you should now see your remote desktop in the browser.
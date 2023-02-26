const { EmberClient } = require('emberplus-connection');

let eGet = new EmberClient("192.168.0.35", 9000);
eGet.on('connected', () => {
    console.log("emberGet connection ok");
})
eGet.on('error', (e, err) => {
    console.log("connection error", err)
})


let descriptions = []

async function walkthrough() {
    const err = await eGet.connect()
    if (err) { // err = true when the first connection attempt fails (depending on timeout)
        console.log(' connection to emberGet unsuccessful->' + err);
        return
      }
//    const etree =await eGet.expand(eGet.tree)
//    console.log("tree",etree)
    root = await (await eGet.getDirectory(eGet.tree)).response
    //console.log("Root:",root)
    let initial = 0x02
    let nextlevel = ""
    let path = [2]
    for(i= 2;i < 0xd4B; i++){
    try {
        //          await mainFunctions.sleep(2000);
        let req;
        if (path.length ==1){
          req  = await eGet.getElementByPath(path.toString())
          descriptions.push(req.contents.description)
          path = [i,i + 1]
        }else{
          req  = await eGet.getElementByPath(path.join("."))
          descriptions.push(req.contents.description)
          if (req.contents.type == 'NODE'){
          path.push(i+1)
          }else{
            path.pop()
            path.push(i+1)
          }
        }
        console.log("descriptions",descriptions[(descriptions.length)-1])
        
        console.log("updatedpath", path)
      } catch (e) {
        try{
        msg = e;
        console.log("error: ",msg,path)
        path.splice(-2,2)
        path.push(i)
        console.log("updatedpath3", path)
        req  = await eGet.getElementByPath(path.join("."))
          descriptions.push(req.contents.description)        
        i = i-1
        }catch(e){
          path.splice(-1,1)
        path.push(i-1)
        console.log("updatedpath4", path)        
        i = i-1
        }
        continue
      }
    }
    

}walkthrough()


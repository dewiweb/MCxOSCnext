const { EmberClient } = require('emberplus-connection');
const { EmberNodeImpl, NumberedTreeNodeImpl } = require('emberplus-connection/dist/model');

let eGet = new EmberClient("192.168.0.35", 9000);
eGet.on('connected', () => {
    console.log("emberGet connection ok");
    
})
eGet.on('error', (e, err) => {
    console.log("connection error", err)
})


let descriptions = []

let req_second;
async function walkthrough() {
    const err = await eGet.connect()
    if (err) { // err = true when the first connection attempt fails (depending on timeout)
        console.log(' connection to emberGet unsuccessful->' + err);
        return
    }

    const req = await eGet.getDirectory(eGet.tree)
    const root = await req.response
    let first_level = Object.values(eGet.tree).map(({number})=> number)
    console.log("first_level",first_level)
    for (const element of first_level){
        let req_first = await eGet.getElementByPath(element.toString())
        await eGet.expand(req_first)
        let req_first_content = Object.values(req_first)
        console.log("req_first values",req_first_content)
        let second_level = req_first_content.filter(el=>el!=undefined && "number" in Object.keys(el)) 
        console.log("second_level_1",second_level)
       // second_level = Object.values(second_level).filter(el=>el != 'NODE')
       // console.log("second_level_2",second_level)
        second_level= second_level.map(({number})=>number)
        console.log("second_level_3",second_level)
        for (const second of second_level){
            req_second = await eGet.getElementByPath(element.toString()+"."+second.toString())
            await eGet.expand(req_second)
            let req_second_content = Object.values(req_second)
            console.log("req_second values",req_second_content)
        }
    };
   // console.log("second_level",req_second)
    console.log("FINISHED")



//    const etree =await eGet.expand(eGet.tree)
//    
//    root = await (await eGet.getDirectory(eGet.tree)).response
 //   await eGet.expand(root)
 //  console.log("ROOT_length",Object(root).constructor)
//    console.log("TREE". eGet.tree)
//    console.log("ROOT_KEYS",Object.entries(root)[1].length)
//    console.log("ROOT_CONTENTS",(Object.entries(root)[1])[1])
 //   console.log("CHILDREN",Object.values(root.children)[0])
// const numbers = (Object.root)[0].map(({number}) => number);
 // Here you can access object which you want
 //console.log(numbers);


        
      
//    req  = await eGet.getElementByPath("11043")
//    console.log("req: ",JSON.stringify(req))
//    if (root.contents.children != undefined) 
//  {
//    root.contents.children.forEach( s => console.log("childrens:",s) );
//  }
//    //console.log("Root:",root)
//    let initial = 0x02
//    let nextlevel = ""
//    let path = [2]
//    for(i= 2;i < 0xd4B; i++){
//    try {
//        //          await mainFunctions.sleep(2000);
//        let req;
//        if (path.length ==1){
//          req  = await eGet.getElementByPath(path.toString())
//          descriptions.push(req.contents.description)
//          path = [i,i + 1]
//        }else{
//          req  = await eGet.getElementByPath(path.join("."))
//          descriptions.push(req.contents.description)
//          if (req.contents.type == 'NODE'){
//          path.push(i+1)
//          }else{
//            path.pop()
//            path.push(i+1)
//          }
//        }
//        console.log("descriptions",descriptions[(descriptions.length)-1])
//        
//        console.log("updatedpath", path)
//      } catch (e) {
//        try{
//        msg = e;
//        console.log("error: ",msg,path)
//        path.splice(-2,2)
//        path.push(i)
//        console.log("updatedpath3", path)
//        req  = await eGet.getElementByPath(path.join("."))
//          descriptions.push(req.contents.description)        
//        i = i-1
//        }catch(e){
//          path.splice(-1,1)
//        path.push(i-1)
//        console.log("updatedpath4", path)        
//        i = i-1
//        }
//        continue
//      }
//    }
//    
//
}walkthrough()


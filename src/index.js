import express from "express"
import {dirname, join} from 'path' //
import {fileURLToPath} from "url"  //
import multer from 'multer' //este módulo permite cargar un archivo 
import XLSX from 'xlsx'


const app = express()

const __dirname = dirname(fileURLToPath(import.meta.url)) //

app.set('views', join(__dirname, 'views')) //
app.set('view engie', 'ejs') //


app.use(express.static(join(__dirname, 'public')))

const ExcelAJSON = async () => {

/* Correspond to the import of the Excel file, 
which is loaded as data.xlsx. Reloading rewrites the existing data.xlsx file */
const ExcelLOAD = () => {
const storage = multer.diskStorage({
    destination: __dirname + '/uploads/',
    filename: function(req, file, cb){
        cb("", "data.xlsx");
    }
})

const upload = multer({
    storage: storage
})

app.get("/", (req, res) =>{
    res.sendFile(__dirname) + "/views/importinfo.ejs";
})

app.post("/file", upload.single('avatar'), (req, res) => {
    res.send("Todo Bien")
})
}

ExcelLOAD()

//Convierte los datos del archivo Excel en JSON

const excel = XLSX.readFile(__dirname + '/uploads/data.xlsx');
var nombreHoja = excel.SheetNames;
let datos = XLSX.utils.sheet_to_json(excel.Sheets[nombreHoja[0]]);

//obtenemos el valor máximo (KL), mínimo (K0) y total de la población

const dataSort = datos.sort((a,b) =>{
    return Number.parseInt(b.POPULATION) - Number.parseInt(a.POPULATION)
    }) 
    
let KL = dataSort[0].POPULATION
    console.log("KL", KL)

let PT = datos.reduce((sum, value)=> (typeof value.POPULATION == "number" ? sum + value.POPULATION : sum), 0);
        console.log("PT", PT); 

const dataSort_ = datos.sort((a,b) =>{
    return Number.parseInt(a.POPULATION) - Number.parseInt(b.POPULATION)
    }) 
    
let Ko = dataSort_[0].POPULATION
    console.log("Ko", Ko)

//número de estratos (L)

    let L = 6
    let a = 0.770
    let n = 1705
        console.log("L", L)
        console.log("a", a)
        console.log("n", n)

// Calcula la constante (r) 

const r = (KL/Ko)**(1/L)
        console.log("r", r)

//Crea un objeto que determina el límite inferior y superior de cada estrato mediante el método geométrico

let strataGEO = [];
for (let i = 1; i < L+1; i++) {
    let Kh = Math.round(Ko*(r**[i]))
    let Khi = (Math.round(Ko*(r**([i]-1)))+1)
    let Khiif;
    if ((Khi) == (Ko+1)) {
            Khiif = (Ko);
          } else {
            Khiif = Khi;
          }
    strataGEO.push({ h:i, 
        Kh:Kh,
        Khi:Khiif
    })
}

console.log("strataGEO", strataGEO)

let stratiData = [];

for (let i = 0; i < datos.length; i++) {
    if (!datos[i].hasOwnProperty('POPULATION')) {
        continue;
    }
    let Po = datos[i].POPULATION
    let Co = datos[i].CODE
    let Dis = datos[i].DISTRICT
    let Bs = datos[i].BUSINESS_NAME
    let St = datos[i].STATE
    let Ct = datos[i].CITY

    for(let j = 0; j < strataGEO.length; j++){
        if (!strataGEO[j].hasOwnProperty('h')) {
            continue;
        }
        let h = strataGEO[j].h
        let Kh = strataGEO[j].Kh
        let Khi = strataGEO[j].Khi


      if (Po <= Kh && Po >= Khi){
        let hi = h;
        let Bn = 1

      
    stratiData.push({"Co":Co, Po: Po, h: hi, Bn: Bn, "Dis": Dis, "Bs": Bs, "St": St, "Ct": Ct});
}}}

// console.log("stratiData", stratiData)

let PTbyS = [];

stratiData.forEach(function (a) {
    if ( !this[a.h] ) {
        this[a.h] = { h: a.h, Po: 0, Bn:0};
        PTbyS.push(this[a.h]);
    } 
    this[a.h].Po += a.Po;
    this[a.h].Bn += a.Bn;
}, Object.create(null));

    console.log("PTbyS", PTbyS)

let EPa = []

for (let i = 0; i < PTbyS.length; i++){
    if (!PTbyS[i].hasOwnProperty('Po')) {
        continue;
    }
    let Po = PTbyS[i].Po
    let hi = PTbyS[i].h
    let Bn = PTbyS[i].Bn
    let Pa = Math.round(Po**a)
    EPa.push({h: hi, Po: Po, "Pa": Pa, "Bn": Bn});
}
    console.log("Epa", EPa)



let nhT = [];

for (let i = 0; i < EPa.length; i++){
    if (!EPa[i].hasOwnProperty('Po')) {
        continue;
    }
    let Po = EPa[i].Po
    let hi = EPa[i].h
    let Pa = EPa[i].Pa
    let Bn = EPa[i].Bn
    let EPTa = EPa.reduce((sum, value)=> (typeof value.Pa == "number" ? sum + value.Pa : sum), 0);
    let nh = Math.round(n*(Pa/EPTa))
    let Wh = Pa/EPTa
    let Whp = (Wh*100).toPrecision(2)
    nhT.push({h: hi, n: n, "PT": PT ,Po: Po, "Bn": Bn, "Pa": Pa, "EPTa": EPTa, "nh": nh, "Wh": Whp})
}
    console.log("nhT", nhT)

let nxB = []



for (let i = 0; i < stratiData.length; i++){
    if (!stratiData[i].hasOwnProperty('Po')) {
        continue;
    }

    let Po = stratiData[i].Po
    let Co = stratiData[i].Co
    let hs = stratiData[i].h
    let Dis = stratiData[i].Dis
    let Bs = stratiData[i].Bs
    let St = stratiData[i].St
    let Ct = stratiData[i].Ct

    for(let j = 0; j < nhT.length; j++){
        if (!nhT[j].hasOwnProperty('nh')) {
            continue;
        }
        let nh = nhT[j].nh
        let Pa = nhT[j].Pa
        let h = nhT[j].h

        let nhxB = Math.round(nh*((Po**a)/Pa))
        if (hs === h){
        nxB.push({"Co": Co,"Po": Po,"hs": hs ,"nh": nh, "Pa": Pa,"nhxB": nhxB, "Dis": Dis, "Bs": Bs, "St": St, "Ct": Ct})
    }}}
    // console.log("nxB",nxB)
    
    //Interaction with the frames

    app.get('/', function(req, res) {
    res.render(join(__dirname,'views/index.ejs'), {
        
        });
    });
    
    app.get('/contact', function(req, res) {
        res.render(join(__dirname,'views/contact.ejs'), {
            nxB
            });
        });

    app.get('/about', function(req, res) {
        res.render(join(__dirname,'views/about.ejs'), {
            
            });
        });

    app.get('/importdata', function(req, res) {
        res.render(join(__dirname,'views/importdata.ejs'), {
            nhT
            });
        });

    app.get('/importinfo', function(req, res) {
        res.render(join(__dirname,'views/importinfo.ejs'), {
            datos,
            });
        });



  

}; 


ExcelAJSON()



app.listen(3000)
console.log('Server is listening on port', 3000)






    //Crea la tabla a partir del JSON

    // const pathfile = (__dirname +'views/importinfo.ejs')
    // app.get('/importinfo', function(req, res) {
    // res.render(pathfile, {
    //     datos: datos,
    //     });
    // });

    //




// let jsonData = JSON.stringify(datos);
//     fs.writeFile(join(__dirname, '/uploads/data.json'), jsonData, (error) =>{
//         if(error){
//             console.log(`Error:${error}`);
//         }else{
//             console.log("file JSON has been generated");
//         }
//         });

// console.log(join(__dirname , '/uploads/data.json'))

// fetch(join(__dirname , '/uploads/data.json'))
// .then(res => res.json())
// .then(datos => {
    
//     const arrayElement = datos
//     arrayElement.forEach(item => {

//         // lista.innerHTML += `<li><a href=${item.CODE}>${item.POPULATION}</a></li>`
//     });
// })


// const response = await fetch('https://api.github.com/users/github');
// const data = await response.json();

// // console.log(data);
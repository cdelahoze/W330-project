import express from "express";
import { dirname, join } from "path"; //
import { fileURLToPath } from "url"; //
import multer from "multer"; //este módulo permite cargar un archivo
import XLSX from "xlsx";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import GoogleChartsNode from "google-charts-node";

const app = express();

const __dirname = dirname(fileURLToPath(import.meta.url)); //

app.set("views", join(__dirname, "views")); //
app.set("view engie", "ejs"); //

app.use(express.static(join(__dirname, "public")));
app.use(express.urlencoded()); //Parse URL-encoded bodies

const ExcelAJSON = async () => {
  /* Correspond to the import of the Excel file, 
which is loaded as data.xlsx. Reloading rewrites the existing data.xlsx file */
  const ExcelLOAD = () => {
    const storage = multer.diskStorage({
      destination: __dirname + "/uploads/",
      filename: function (req, file, cb) {
        cb("", "data.xlsx");
      },
    });

    const upload = multer({
      storage: storage,
    });

    app.get("/", (req, res) => {
      res.sendFile(__dirname) + "/views/importinfo.ejs";
    });

    app.post("/file", upload.single("avatar"), (req, res) => {
      res.redirect("/importinfo");
    });
  };

  ExcelLOAD();

  //Crear JSON desde input HTML

  app.post("/importinfo", (req, res) => {
    const { stratum, variance } = req.body;

    if (!stratum || !variance) {
      res.status(400).send("Entries must have information");
      return;
    }

    let newBook = {
      id: uuidv4(),
      stratum,
      variance,
    };

    books.push(newBook);

    const json_books = JSON.stringify(books);
    fs.writeFileSync(
      join(__dirname, "/uploads/books.json"),
      json_books,
      "utf-8"
    );
    res.redirect("/importinfo");
  });

  const json_books = fs.readFileSync(
    join(__dirname, "/uploads/books.json"),
    "utf-8"
  );
  let books = JSON.parse(json_books);

  app.get("/delete/:id", (req, res) => {
    books = books.filter((book) => book.id != req.params.id);
    const json_books = JSON.stringify(books);
    fs.writeFileSync(
      join(__dirname, "/uploads/books.json"),
      json_books,
      "utf-8"
    );
    res.redirect("/importinfo");
  });

  //Importar iformación estadísitica desde el HTML

  app.post("/parameter", (req, res) => {
    const { error, confidence, affixation } = req.body;

    if (!error || !confidence || !affixation) {
      res.status(400).send("Entries must have information");
      return;
    }

    let paramet = {
      id: uuidv4(),
      error,
      confidence,
      affixation,
    };

    parameters.push(paramet);

    const json_param = JSON.stringify(parameters);
    fs.writeFileSync(
      join(__dirname, "/uploads/parameters.json"),
      json_param,
      "utf-8"
    );

    res.redirect("/importinfo");
  });

  const json_param = fs.readFileSync(
    join(__dirname, "/uploads/parameters.json"),
    "utf-8"
  );
  let parameters = JSON.parse(json_param);

  app.get("/delete_/:id", (req, res) => {
    parameters = parameters.filter((param) => param.id != req.params.id);
    const json_param = JSON.stringify(parameters);
    fs.writeFileSync(
      join(__dirname, "/uploads/parameters.json"),
      json_param,
      "utf-8"
    );
    res.redirect("/importinfo");
  });

  //Convierte los datos del archivo Excel en JSON

  const excel = XLSX.readFile(__dirname + "/uploads/data.xlsx");
  var nombreHoja = excel.SheetNames;
  let datos = XLSX.utils.sheet_to_json(excel.Sheets[nombreHoja[0]]);

  //obtenemos el valor máximo (KL), mínimo (K0) y total de la población

  const dataSort = datos.sort((a, b) => {
    return Number.parseInt(b.POPULATION) - Number.parseInt(a.POPULATION);
  });

  let KL = dataSort[0].POPULATION;
  console.log("KL", KL);

  let PT = datos.reduce(
    (sum, value) =>
      typeof value.POPULATION == "number" ? sum + value.POPULATION : sum,
    0
  );
  console.log("PT", PT);

  const dataSort_ = datos.sort((a, b) => {
    return Number.parseInt(a.POPULATION) - Number.parseInt(b.POPULATION);
  });

  let Ko = dataSort_[0].POPULATION;
  console.log("Ko", Ko);

  //obtenemos el valor máximo de stratum (L)
  //número de estratos (L)

  let L;
  const dataSort_L = books.sort((a, b) => {
    return Number.parseInt(b.stratum) - Number.parseInt(a.stratum);
  });

  if (Object.keys(books).length === 0) {
    L = 0; //execute
  } else {
    L = parseInt(dataSort_L[0].stratum);
  }

  console.log(Object.keys(books).length === 0);

  //   L = parseInt(dataSort_L[0].stratum)

  console.log("preL", L);

  //número de estratos (L)

  let e;
  let Z;
  let a;
  const parametersSort_ = parameters.sort((a, b) => {
    return Number.parseInt(a.error) - Number.parseInt(b.error);
  });

  if (Object.keys(parameters).length === 0) {
    Z = 0; //execute
    e = 0;
    a = 0;
  } else {
    e = Number.parseFloat(parametersSort_[0].error);
    Z = Number.parseFloat(parametersSort_[0].confidence);
    a = Number.parseFloat(parametersSort_[0].affixation);
  }

  console.log("L", L);
  console.log("a", a);
  console.log("e", e);
  console.log("Z", Z);

  // Calcula la constante (r)

  const r = (KL / Ko) ** (1 / L);
  console.log("r", r);

  //Crea un objeto que determina el límite inferior y superior de cada estrato mediante el método geométrico

  let strataGEO = [];
  for (let i = 0; i < books.length; i++) {
    if (!books[i].hasOwnProperty("stratum")) {
      continue;
    }
    let hi = Number.parseInt(books[i].stratum);
    let Kh = Math.round(Ko * r ** [hi]);
    let Khi = Math.round(Ko * r ** ([hi] - 1)) + 1;
    let Khiif;
    if (Khi == Ko + 1) {
      Khiif = Ko;
    } else {
      Khiif = Khi;
    }
    strataGEO.push({ h: hi, Kh: Kh, Khi: Khiif });
  }

  console.log("strataGEO", strataGEO);

  let stratiData = [];

  for (let i = 0; i < datos.length; i++) {
    if (!datos[i].hasOwnProperty("POPULATION")) {
      continue;
    }
    let Po = datos[i].POPULATION;
    let Co = datos[i].CODE;
    let Dis = datos[i].DISTRICT;
    let Bs = datos[i].BUSINESS_NAME;
    let St = datos[i].STATE;
    let Ct = datos[i].CITY;

    for (let j = 0; j < strataGEO.length; j++) {
      if (!strataGEO[j].hasOwnProperty("h")) {
        continue;
      }
      let h = strataGEO[j].h;
      let Kh = strataGEO[j].Kh;
      let Khi = strataGEO[j].Khi;

      if (Po <= Kh && Po >= Khi) {
        let hi = h;
        let Bn = 1;

        stratiData.push({
          Co: Co,
          Po: Po,
          h: hi,
          Bn: Bn,
          Dis: Dis,
          Bs: Bs,
          St: St,
          Ct: Ct,
        });
      }
    }
  }

  // console.log("stratiData", stratiData)

  let PTbyS = [];

  stratiData.forEach(function (a) {
    if (!this[a.h]) {
      this[a.h] = { h: a.h, Po: 0, Bn: 0 };
      PTbyS.push(this[a.h]);
    }
    this[a.h].Po += a.Po;
    this[a.h].Bn += a.Bn;
  }, Object.create(null));

  console.log("PTbyS", PTbyS);

  let EPa = [];

  for (let i = 0; i < PTbyS.length; i++) {
    if (!PTbyS[i].hasOwnProperty("Po")) {
      continue;
    }
    let Po = PTbyS[i].Po;
    let hi = PTbyS[i].h;
    let Bn = PTbyS[i].Bn;
    let Pa = Math.round(Po ** a);
    let Wh = Po / PT;
    EPa.push({ h: hi, Po: Po, Pa: Pa, Bn: Bn, Wh: Wh });
  }
  console.log("Epa", EPa);

  let WhxS = [];
  for (let i = 0; i < EPa.length; i++) {
    if (!EPa[i].hasOwnProperty("Wh")) {
      continue;
    }

    let S = Number.parseFloat(books[i].variance);
    let hi = Number.parseInt(books[i].stratum);
    let Wh = EPa[i].Wh;
    let WhxSs = S * Wh;

    WhxS.push({ hi: hi, S: S, Wh: Wh, WhxSs: WhxSs });
  }

  console.log("WhxS", WhxS);

  let EWhxS = WhxS.reduce(
    (sum, value) => (typeof value.WhxSs == "number" ? sum + value.WhxSs : sum),
    0
  );

  let n = Math.round(EWhxS / (e ** 2 / Z ** 2 + EWhxS / PT));

  console.log("EWhxS", EWhxS);
  console.log("n", n);

  let nhT = [];

  for (let i = 0; i < EPa.length; i++) {
    if (!EPa[i].hasOwnProperty("Po")) {
      continue;
    }
    let Po = EPa[i].Po;
    let hi = EPa[i].h;
    let Pa = EPa[i].Pa;
    let Bn = EPa[i].Bn;
    let EPTa = EPa.reduce(
      (sum, value) => (typeof value.Pa == "number" ? sum + value.Pa : sum),
      0
    );
    let nh = Math.round(n * (Pa / EPTa));
    let Wh = Pa / EPTa;
    let Whp = (Wh * 100).toPrecision(2);
    nhT.push({
      h: hi,
      n: n,
      PT: PT,
      Po: Po,
      Bn: Bn,
      Pa: Pa,
      EPTa: EPTa,
      nh: nh,
      Wh: Whp,
    });
  }
  console.log("nhT", nhT);

  let nxB = [];

  for (let i = 0; i < stratiData.length; i++) {
    if (!stratiData[i].hasOwnProperty("Po")) {
      continue;
    }

    let Po = stratiData[i].Po;
    let Co = stratiData[i].Co;
    let hs = stratiData[i].h;
    let Dis = stratiData[i].Dis;
    let Bs = stratiData[i].Bs;
    let St = stratiData[i].St;
    let Ct = stratiData[i].Ct;

    for (let j = 0; j < nhT.length; j++) {
      if (!nhT[j].hasOwnProperty("nh")) {
        continue;
      }
      let nh = nhT[j].nh;
      let Pa = nhT[j].Pa;
      let h = nhT[j].h;

      let nhxB = Math.round(nh * (Po ** a / Pa));
      if (hs === h) {
        nxB.push({
          Co: Co,
          Po: Po,
          hs: hs,
          nh: nh,
          Pa: Pa,
          nhxB: nhxB,
          Dis: Dis,
          Bs: Bs,
          St: St,
          Ct: Ct,
        });
      }
    }
  }

  //Interaction with the frames

  app.get("/", function (req, res) {
    res.render(join(__dirname, "views/index.ejs"), {});
  });

  app.get("/contact", function (req, res) {
    res.render(join(__dirname, "views/contact.ejs"), {
      nxB,
    });
  });

  app.get("/about", function (req, res) {
    res.render(join(__dirname, "views/about.ejs"), {});
  });

  app.get("/importdata", function (req, res) {
    res.render(join(__dirname, "views/importdata.ejs"), {
      nhT,
    });
  });

  app.get("/importinfo", function (req, res) {
    res.render(join(__dirname, "views/importinfo.ejs"), {
      datos,
      books,
      parameters,
    });
  });

  app.post("/importinfo", (req, res) => {
    console.log(req.body);
    res.send("received");
  });

  //graphics creation

  const myOtherArg = []
  const myArg = []

  for (let i = 0; i < PTbyS.length; i++) {
    if (!PTbyS[i].hasOwnProperty("Po")) {
      continue;
    }
    let Po = PTbyS[i].Po;
    let hi = PTbyS[i].h;

    myOtherArg.push(Po);
    myArg.push(hi)
  }

  console.log(myOtherArg)
  console.log(myArg)


  const drawChartStr = `
  // Create the data table.
  var data = new google.visualization.DataTable();
  data.addColumn('string', 'Topping');
  data.addColumn('number', 'Population');
  data.addRows([
    ['h${myArg[0]}', ${myOtherArg[0]}],
    ['h${myArg[1]}', ${myOtherArg[1]}],
    ['h${myArg[2]}', ${myOtherArg[2]}],
    ['h${myArg[3]}', ${myOtherArg[3]}],
    ['h${myArg[4]}', ${myOtherArg[4]}],
    ['h${myArg[5]}', ${myOtherArg[5]}],
    ['h${myArg[6]}', ${myOtherArg[6]}],
    ['h${myArg[7]}', ${myOtherArg[7]}],
  ]);
  // Set chart options
  var options = { title: 'Population by stratum' };
  // Instantiate and draw our chart, passing in some options.
  var chart = new google.visualization.PieChart(document.getElementById('chart_div'));
  chart.draw(data, options);
`;
  const graphic = await GoogleChartsNode.render(drawChartStr, {
    width: 500,
    height: 300,
  });

  fs.writeFileSync(join(__dirname, "images/graphic_1.png"), graphic, "utf-8");
};



app.use(express.static(join(__dirname, "/images")));

ExcelAJSON();

app.listen(3000);
console.log("Server is listening on port", 3000);

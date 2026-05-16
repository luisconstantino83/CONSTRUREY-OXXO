const XLSX = require("xlsx")
const fs = require("fs")

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`

  const res = await fetch(url, {
    headers: {
      "User-Agent": "CONSTRUREY-OXXO"
    }
  })

  const data = await res.json()

  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    }
  }

  return null
}

async function run() {
  const workbook = XLSX.readFile("tiendas_134_limpias_para_mapa.xlsx")
  const sheet = workbook.Sheets[workbook.SheetNames[0]]

  const rows = XLSX.utils.sheet_to_json(sheet)

  const resultado = []

  for (const row of rows) {
    const direccion = `${row.DIRECCION}, Tamaulipas, Mexico`

    console.log("Buscando:", direccion)

    const coords = await geocode(direccion)

    resultado.push({
      cr: row.CR,
      nombre: row.TIENDA,
      ciudad: row.LOC,
      direccion: row.DIRECCION,
      lat: coords?.lat || null,
      lng: coords?.lng || null
    })

    await sleep(1200)
  }

  fs.writeFileSync(
    "tiendas_geocodificadas.json",
    JSON.stringify(resultado, null, 2)
  )

  console.log("Listo")
}

run()

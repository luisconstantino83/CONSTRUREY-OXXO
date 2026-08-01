"use client"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { MapPin, List, Map } from "lucide-react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false })

const RUTA_COLORS: Record<number, string> = { 1: "#22c55e", 2: "#3b82f6", 3: "#f97316" }
const RUTA_NAMES: Record<number, string> = { 1: "Reynosa Sur", 2: "Rio Bravo", 3: "Reynosa Norte" }
const RUTA_EMOJIS: Record<number, string> = { 1: "🟢", 2: "🔵", 3: "🟠" }

const TIENDAS = [
  { cr: '50JEV', nombre: 'OXXO AGUSTIN LARA REX', ciudad: 'Reynosa', lat: 26.07045071771738, lng: -98.30710549684545, direccion: 'BLVD. DEL MAESTRO ESQ. AGUSTIN LARA COL:NARCIZO MENDOZA', ruta: 3, orden: 31 },
  { cr: '50BTH', nombre: 'OXXO BEETHOVEN REX', ciudad: 'Reynosa', lat: 26.074535819860767, lng: -98.30971684233408, direccion: 'CALLE BEETHOVEN Y PADRE SOLER COLONIA NARCIZO MENDOZA', ruta: 3, orden: 30 },
  { cr: '50BPI', nombre: 'OXXO CAÑADA REX', ciudad: 'Reynosa', lat: 26.06369180615547, lng: -98.31081098096226, direccion: 'CALLE LONDRES SN COL CAÑADA', ruta: 3, orden: 26 },
  { cr: '50IEP', nombre: 'OXXO CIRCUITO INDEPENDENCIA REX', ciudad: 'Reynosa', lat: 26.060041223661532, lng: -98.32243193135783, direccion: 'RIO SAN JUAN ESQ. CIRCUITO INDEPENDENCIA SN  COL AZTLAN PROLONGACION', ruta: 3, orden: 40 },
  { cr: '50BZE', nombre: 'OXXO DEL MAESTRO REX', ciudad: 'Reynosa', lat: 26.0708491684661, lng: -98.30080123045785, direccion: 'BLVD. DEL MAESTRO S/N COL DEL SOL REYNOSA, TAMAULIPAS', ruta: 3, orden: 33 },
  { cr: '50SWE', nombre: 'OXXO DOCTORES REX', ciudad: 'Reynosa', lat: 26.058942267301752, lng: -98.29929195967262, direccion: 'H. DE ANDAR ESQ. AGATHA, COL. DOCTORES', ruta: 3, orden: 23 },
  { cr: '50CJT', nombre: 'OXXO ELIAS PINA REX', ciudad: 'Reynosa', lat: 26.06538535607712, lng: -98.31397099738581, direccion: 'CALLE : ELIAS PIÑA  SN  COL. AZTLAN  REYNOSA TAMAULIPAS', ruta: 3, orden: 27 },
  { cr: '50OFF', nombre: 'OXXO FUENTES REX', ciudad: 'Reynosa', lat: 26.070520247206808, lng: -98.31467318944397, direccion: 'BLVD. LAS FUENTES # 250 COL: LAS FUENTES', ruta: 3, orden: 29 },
  { cr: '50769', nombre: 'OXXO JUAREZ 2 REX', ciudad: 'Reynosa', lat: 26.021895360432108, lng: -98.26569246562048, direccion: 'CALLE ENRIQUE CANSECO #549 COL. PEDRO J. MENDEZ', ruta: 3, orden: 12 },
  { cr: '50HO9', nombre: 'OXXO CALZADA VICTORIA REX', ciudad: 'Reynosa', lat: 26.022180336368418, lng: -98.27669128150379, direccion: 'Carretera San Fernando Reynosa Col. Pedro J Mendez 1ra secc C.P. 88799 entre calles Calzada Victoria y R. Villareal', ruta: 2, orden: 35 },
  { cr: '50EQC', nombre: 'OXXO ENRIQUE CANSECO REX', ciudad: 'Reynosa', lat: 26.022480442133713, lng: -98.26874083601493, direccion: 'ENRIQUE CANSECO NO 485 COL PEDRO J MENDEZ 1RA SECC REYNOSA, TAMAULIPAS', ruta: 3, orden: 11 },
  { cr: '50PUI', nombre: 'OXXO RIO PURIFICACION REX', ciudad: 'Reynosa', lat: 26.035464838669252, lng: -98.29606059445577, direccion: 'RIO PURIFICACION #210 COL  DOCTORES', ruta: 3, orden: 6 },
  { cr: '50HXU', nombre: 'OXXO PLAZA JUAREZ REX', ciudad: 'Reynosa', lat: 26.0216593020513, lng: -98.28342879630665, direccion: 'HEROES DE LA REFORMA SANTOS DEGOLLADO Y FRANCISCO ZARCO 111 88790 BENITO JUAREZ REYNOSA REYNOSA TAMAULIPAS', ruta: 2, orden: 37 },
  { cr: '50ZPS', nombre: 'OXXO LA PRESA REX', ciudad: 'Reynosa', lat: 26.04743722488252, lng: -98.29894470424745, direccion: 'PROL. RIO PURIFICACION SN COL LA PRESA', ruta: 3, orden: 3 },
  { cr: '500ER', nombre: 'OXXO TAMAULIPAS REX', ciudad: 'Reynosa', lat: 26.033776968216774, lng: -98.29402358745672, direccion: 'PROL. RIO PURIFICACION ESQUINA AMERICO VILLARREAL COLONIA TAMAULIPAS, REYNOSA TAMPS', ruta: 3, orden: 7 },
  { cr: '508IZ', nombre: 'OXXO BLVD REYNOSA REX', ciudad: 'Reynosa', lat: 26.029777340668847, lng: -98.28752002047308, direccion: 'BLVD. REYNOSA ESQUINA AVE. LAS TORRES S/N COL. CAPITAN CARLOS CANTU  REYNOSA, TMPS', ruta: 2, orden: 40 },
  { cr: '50IDL', nombre: 'OXXO IDEAL REX', ciudad: 'Reynosa', lat: 26.04786276348554, lng: -98.29998392329121, direccion: 'RIO PURIFICACION No. 98 COL EJIDO PRESA LA LAGUNA', ruta: 3, orden: 2 },
  { cr: '50NLD', nombre: 'OXXO LAREDO REX', ciudad: 'Reynosa', lat: 26.05313521431052, lng: -98.29873938890418, direccion: 'CALLE RIO PURIFICACION ESQUINA CALLE LAREDO COL. REVOLUCION OBRERA S/N', ruta: 3, orden: 1 },
  { cr: '50A9Y', nombre: 'OXXO PUERTO ESCONDIDO REX', ciudad: 'Reynosa', lat: 26.01194583960638, lng: -98.2853816097996, direccion: 'AVE. HEROES DE LA REFORMA ESQ. CALLE PUERTO ESCONDIDO COL. BENITO JUAREZ', ruta: 2, orden: 42 },
  { cr: '50VYO', nombre: 'OXXO BENITO JUAREZ REX', ciudad: 'Reynosa', lat: 26.0214312198882, lng: -98.2788161926059, direccion: 'BLVD. MARGARITA MAZA DE JUAREZ ENTRE CALLE IXTEPEC Y MIHUATLAN COL. BENITO JUAREZ CP. 88900  SN', ruta: 2, orden: 36 },
  { cr: '50WJI', nombre: 'OXXO IGNACIO MARISCAL REX', ciudad: 'Reynosa', lat: 26.02022491813683, lng: -98.2839070656206, direccion: 'HEROES DE LA REFORMA ENTRE IGNACIO MARISCAL/FRANCISCO ZARCO NO.214 C.P.88790 COLONIA.BENITO JUAREZ', ruta: 2, orden: 38 },
  { cr: '50FKH', nombre: 'OXXO HEROES DE LA REFORMA REX', ciudad: 'Reynosa', lat: 26.028395890977507, lng: -98.28240969445604, direccion: 'HEROES DE LA REFORMA S/N COL CAP CARLOS CANTU REYNOSA, TAMAULIPAS', ruta: 2, orden: 41 },
  { cr: '50QSO', nombre: 'OXXO COLOSIO REX', ciudad: 'Reynosa', lat: 26.03536218101589, lng: -98.2963688359564, direccion: 'RIO PURIFICACION  ENTRE ESQUINA CALLE SONORA  S/N C.P. 88793 COLONIA. LUIS DONALDO COLOSIO', ruta: 3, orden: 5 },
  { cr: '50RRM', nombre: 'OXXO MORELOS II REX', ciudad: 'Reynosa', lat: 26.0580459978994, lng: -98.29379873493322, direccion: 'BLVD. MORELOS  ENTRE CALLE  ALVARO OBREGON # 95 (PUENTE DE LA MUERTE)COL.DOCTORES', ruta: 3, orden: 22 },
  { cr: '50RWN', nombre: 'OXXO GUELATAO REX', ciudad: 'Reynosa', lat: 26.02296367647932, lng: -98.2885215809635, direccion: 'BULEVARD MARGARITA MAZA DE JUAREZ CON GUELATAO', ruta: 2, orden: 39 },
  { cr: '50BBK', nombre: 'OXXO BETONICA REX', ciudad: 'Reynosa', lat: 25.985231896449903, lng: -98.27861815822018, direccion: 'AV LOMA DE ROSALES ENTRE BETONICA, CAMPANILLA  NO. 1 C.P.88796 COLONIA. RINCON DE LAS FLORES', ruta: 1, orden: 38 },
  { cr: '50HTL', nombre: 'OXXO JACALITOS REX', ciudad: 'Reynosa', lat: 25.922865418695746, lng: -98.26906396932425, direccion: 'CARRET. REYNOSA-SAN FERNANDOKM 101, BRECHA JACALITOS', ruta: 1, orden: 42 },
  { cr: '501DC', nombre: 'OXXO SEGUNDA REX', ciudad: 'Reynosa', lat: 26.021256267856536, lng: -98.27499565212779, direccion: 'CALLE 2 ESQ CON MARGARITA MAZA DE JUAREZ', ruta: 3, orden: 13 },
  { cr: '50LLL', nombre: 'OXXO LAS TORRES REX', ciudad: 'Reynosa', lat: 26.059597668460654, lng: -98.30607569630541, direccion: 'CALLE PEKIN # 403 COL.5 DE DICIEMBRE', ruta: 3, orden: 24 },
  { cr: '50BZD', nombre: 'OXXO LOPEZ  PORTILLO REX', ciudad: 'Reynosa', lat: 26.040156092338464, lng: -98.27882305746093, direccion: 'CARRETERA REYNOSA-LAREDO VICENTE GUERRERO REYNOSA TAMAULIPAS', ruta: 3, orden: 9 },
  { cr: '50LHV', nombre: 'OXXO PETROLERA REX', ciudad: 'Reynosa', lat: 26.068855587043, lng: -98.26972318096209, direccion: 'Calle Veracruz esq. Calle Toteco, Colonia Petrolera, Cd. Reynosa', ruta: 3, orden: 20 },
  { cr: '5059A', nombre: 'OXXO UNIDAD OBRERA REX', ciudad: 'Reynosa', lat: 26.044310714888955, lng: -98.23723455226099, direccion: 'GUANAJUATO ESQ. ZACATECAZ, COL. LAMPACITOS', ruta: 3, orden: 15 },
  { cr: '50AUJ', nombre: 'OXXO ANHELO REX', ciudad: 'Reynosa', lat: 26.06042074071611, lng: -98.24773584933308, direccion: 'BLVD LUIS DONALDO COLOSIO COL. NUEVO AMANECER ,NUM 1500 ,JUNTO A SUBESTACION DE BOMBEO DE COMAPA', ruta: 2, orden: 32 },
  { cr: '50EHO', nombre: 'OXXO DELICIAS REX', ciudad: 'Reynosa', lat: 26.064254356491105, lng: -98.26129879445489, direccion: 'COL. DELICIAS CALLE. LUCIA ENTRE PRESA DE LA AMISTAD Y TORREON', ruta: 3, orden: 18 },
  { cr: '50EPW', nombre: 'OXXO ESPUELA REX', ciudad: 'Reynosa', lat: 26.066374153350385, lng: -98.26689538466285, direccion: 'AVENIDA ESPUELA DE FERROCARRIL  Num 500 ENTRE REVOLUCION  Y NARANJOS COL PETROLERA', ruta: 3, orden: 19 },
  { cr: '50FDJ', nombre: 'OXXO LAMPACITOS REX', ciudad: 'Reynosa', lat: 26.03766895592716, lng: -98.23516515027697, direccion: 'MICHOACAN S/N ESQ. COAHUILA COL. LAMPACITOS CP. 88780', ruta: 1, orden: 34 },
  { cr: '50GNB', nombre: 'OXXO AEROPUERTO REX', ciudad: 'Reynosa', lat: 26.020418404090776, lng: -98.2265879963066, direccion: 'CARRETERA REYNOSA-MATAMOROS S/N COL BIENESTAR REYNOSA, TAMAULIPAS', ruta: 1, orden: 30 },
  { cr: '50JHS', nombre: 'OXXO UNIV TECNOLOGICA REX', ciudad: 'Reynosa', lat: 26.050150116063495, lng: -98.26451899922328, direccion: 'Ave, Lázaro Cárdenas del Rio Colonia: La Escondida C.P 88770 (oxxo que esta a un lado del parque cultural)', ruta: 2, orden: 33 },
  { cr: '50RJ3', nombre: 'OXXO COMMSCOPE REX', ciudad: 'Reynosa', lat: 26.044233267964024, lng: -98.23058780794823, direccion: 'PARQUE INDUSTRIAL REYNOSA CENTER. (DENTRO DE MAQUILADORA COMMSCOPE', ruta: 3, orden: 16 },
  { cr: '50UGR', nombre: 'OXXO ALMAGUER REX', ciudad: 'Reynosa', lat: 26.030243117892223, lng: -98.23661111589037, direccion: 'CALLE 20 Noviembre  No 101 COL FRACC REYNOSA', ruta: 1, orden: 32 },
  { cr: '50WFW', nombre: 'OXXO TOTECO REX', ciudad: 'Reynosa', lat: 26.0759328552622, lng: -98.2687310889035, direccion: 'BLVD. TOTECO ENTRE BLVD. COLOSIO Y CALLE TRECE DE JULIO NO.535 C.P.88680 COLONIA.PETROLERA', ruta: 3, orden: 21 },
  { cr: '50WLJ', nombre: 'OXXO GENERAL RODRIGUEZ REX', ciudad: 'Reynosa', lat: 26.027696384617002, lng: -98.23070647726269, direccion: 'GENERAL RODRIGUEZ ESQUINA CALLE GUILLERMO PRIETO S/N C.P. 88780 COLONIA. REYNOSA', ruta: 1, orden: 31 },
  { cr: '50ZZS', nombre: 'OXXO ZACATECAS REX', ciudad: 'Reynosa', lat: 26.052022829630143, lng: -98.23822679445531, direccion: 'BLVD. ZACATECAS ENTRE SEGUNDA Y TERCERA COL. UNIDAD OBRERA CP. 88786', ruta: 3, orden: 17 },
  { cr: '50AJY', nombre: 'OXXO LA JOYA REX', ciudad: 'Reynosa', lat: 26.003695974293226, lng: -98.24700761165019, direccion: 'BLVD.VILLA ESMERALDA ESQ.AVE LA JOYA FRACC.VILLA ESMERALDA', ruta: 1, orden: 1 },
  { cr: '50BRM', nombre: 'OXXO ALMENDROS REX', ciudad: 'Reynosa', lat: 25.995868591397027, lng: -98.24620198150465, direccion: 'SEGUNDA AVENIDA ESQUINA CALLE 7 COL FRACC, ALMENDROS II', ruta: 1, orden: 21 },
  { cr: '50BSV', nombre: 'OXXO CIPRES REX', ciudad: 'Reynosa', lat: 25.995867098730606, lng: -98.25693849684765, direccion: 'CIRCUITO INTERIOR S/N ENTRE CIPRES Y ARRAYAN  FRACC. ALMENDROS', ruta: 1, orden: 20 },
  { cr: '50E9G', nombre: 'OXXO VIADUCTO REYNOSA REX', ciudad: 'Reynosa', lat: 25.996964575449432, lng: -98.26084143863581, direccion: 'VIADUCTO REYNOSA ESQ. CIRCUITO GIRASOLES, FRACCIONAMIENTO LOS ALMENDROS', ruta: 1, orden: 19 },
  { cr: '50EMV', nombre: 'OXXO VILLA ESMERALDA REX', ciudad: 'Reynosa', lat: 26.00775977926066, lng: -98.24545161165008, direccion: 'AVENIDA LA JOYA S/N COL VILLAS DE LA JOYA REYNOSA, TAMAULIPAS', ruta: 1, orden: 2 },
  { cr: '50HEJ', nombre: 'OXXO TREBOL REX', ciudad: 'Reynosa', lat: 25.988781109397266, lng: -98.27320904249392, direccion: 'AVE ROBLE ENTRE AV ROBLE Y CALLE TREBOL S/N C.P.88799 COLONIA.PASEO DE LAS FLORES', ruta: 1, orden: 37 },
  { cr: '50JYT', nombre: 'OXXO HIMALAYA REX', ciudad: 'Reynosa', lat: 26.003977388401715, lng: -98.25290422699322, direccion: 'BLVD ALCALA ESQUINA RIO  RIO ROWINA COL BALCONES DE ALCALA', ruta: 1, orden: 16 },
  { cr: '50LKI', nombre: 'OXXO BALCONES DE ALCALA REX', ciudad: 'Reynosa', lat: 26.00632576975755, lng: -98.26527719630704, direccion: 'BULEVARD  ALCALA Num 101 COL BALCONES DE ALCALA', ruta: 1, orden: 13 },
  { cr: '50OBX', nombre: 'OXXO GIRASOL REX', ciudad: 'Reynosa', lat: 25.993984512321624, lng: -98.27079138096435, direccion: 'AV. LAS FLORES ENTRE AV. LAS FLORES Y GLADIOLA S/N C.P.88799 COLONIA.PASEO DE LAS FLORES', ruta: 1, orden: 36 },
  { cr: '50TSB', nombre: 'OXXO VALLE SOLEADO REX', ciudad: 'Reynosa', lat: 25.96934471470271, lng: -98.26549503308563, direccion: 'PASEO DEL SOL N/N CALLE FRESNO FRACC VALLE SOLEADO', ruta: 1, orden: 39 },
  { cr: '50TSC', nombre: 'OXXO AV. DEL PARQUE REX', ciudad: 'Reynosa', lat: 25.967611508058912, lng: -98.25685170610026, direccion: 'Av. del Parque esq. Ave. Jardín, Fracc. Valle Soleado', ruta: 1, orden: 40 },
  { cr: '50XNY', nombre: 'OXXO ROCALLOSA REX', ciudad: 'Reynosa', lat: 26.005468700916243, lng: -98.25741127911371, direccion: 'BLVD.BALCONES DE ALCALA  ESQ. CORDILLERA MARIANICA  FRACC. BALCONES DE ALCALA', ruta: 1, orden: 15 },
  { cr: '50YBK', nombre: 'OXXO LAUREL REX', ciudad: 'Reynosa', lat: 26.000067622415592, lng: -98.25786352699336, direccion: 'CALLE MANZANO ESQUINA CON CALLE LAUREL S/N C.P. 88799 COL. BALCONES DE ALCALA', ruta: 1, orden: 18 },
  { cr: '50ZLT', nombre: 'OXXO LATON REX', ciudad: 'Reynosa', lat: 26.008630654182504, lng: -98.24208089260634, direccion: 'AVENIDA PUNTA DIAMANTE  SN  COL. AMP LA JOYA', ruta: 1, orden: 3 },
  { cr: '50L2O', nombre: 'OXXO ALAMO REX', ciudad: 'Rio Bravo', lat: 25.992556862580262, lng: -98.11342618281478, direccion: 'Calle Álamo #136 esq. Calle Milagro, Colonia Monterreal, Cd. Rio Bravo', ruta: 2, orden: 4 },
  { cr: '500DE', nombre: 'OXXO BRILLANTE REX', ciudad: 'Reynosa', lat: 26.02477165097781, lng: -98.26051386377, direccion: 'AMERICO VILLAREAL CALLE: CARLOS SALINAS DE GORTARI ENTRE BEATRIZ ANAYA Y AMERICO VILLAREAL', ruta: 1, orden: 11 },
  { cr: '502Y6', nombre: 'OXXO CONQUISTADORES REX', ciudad: 'Rio Bravo', lat: 25.987682293633725, lng: -98.05499206562152, direccion: 'ERNAN CORTES ESQUINA PEDRO DE GUZMAN FRACC. CONQUISTADORES RIO BRAVO, TMPS', ruta: 2, orden: 25 },
  { cr: '50BIX', nombre: 'OXXO CAMPO MILITAR REX', ciudad: 'Reynosa', lat: 26.02500219168449, lng: -98.24518596377003, direccion: 'CARRETERA REYNOSA A MATAMOROS ESQUINA CALLE DOCTOR RODRIGUEZ S/N C.P. 88780 COLONIA. FRACC REYNOSA', ruta: 1, orden: 7 },
  { cr: '50BYM', nombre: 'OXXO NOCHEBUENA REX', ciudad: 'Reynosa', lat: 26.02132616132085, lng: -98.25281245027743, direccion: 'AVE. SAN ANGEL  ESQ. CALLE: NOCHE BUENA  COL. LA ESPERANZA', ruta: 1, orden: 8 },
  { cr: '50CXQ', nombre: 'OXXO CUAUHTEMOC REX', ciudad: 'Rio Bravo', lat: 25.983630553261065, lng: -98.10488745582965, direccion: 'MORELOS S/N COL CUAUHTEMOC RIO BRAVO, TAMAULIPAS', ruta: 2, orden: 7 },
  { cr: '50DMQ', nombre: 'OXXO DEL RIO REX', ciudad: 'Rio Bravo', lat: 25.975675862409904, lng: -98.05778888096495, direccion: 'FRANCISCO I MADERO ESQUINA RIO GRANDE FRACC. DEL RIO, RIO BRAVO, TMPS', ruta: 2, orden: 24 },
  { cr: '50GTH', nombre: 'OXXO AGHATA REX', ciudad: 'Reynosa', lat: 26.01820242466443, lng: -98.2430618232921, direccion: 'Calle: Ave La Joya, Entre Calle: Aghata Col. La Joya C.P 88777, Reynosa, Tamaulipas', ruta: 1, orden: 6 },
  { cr: '50MYC', nombre: 'OXXO RIVERAS DEL CARMEN REX', ciudad: 'Reynosa', lat: 25.99899277041423, lng: -98.23905537829388, direccion: 'Av. Villa de Reynosa SN, Col. Villas de la Joya Ampliación, C.P. 88795, Reynosa Tamaulipas', ruta: 1, orden: 23 },
  { cr: '50ONB', nombre: 'OXXO 18 DE MARZO REX', ciudad: 'Reynosa', lat: 26.034040001231666, lng: -98.25695478281347, direccion: 'CALLE 18 DE MARZO ESQUINA 13 DE SEPTIEMBRE COL. 15 DE ENERO REYNOSA TMS', ruta: 3, orden: 14 },
  { cr: '50RLA', nombre: 'OXXO AMERICAS REX', ciudad: 'Rio Bravo', lat: 25.98244532198924, lng: -98.09043691165087, direccion: 'AV. MEXICO No. 100  ESQUINA LAS PALMAS Y AVENIDA LAS AMERICAS (RIO BRAVO)', ruta: 2, orden: 16 },
  { cr: '50RRF', nombre: 'OXXO SANTA FE REX', ciudad: 'Rio Bravo', lat: 25.979605147614457, lng: -98.06835443863633, direccion: 'AVE. MADERO #109-3 CON MIGUEL HIDALGO COL. LA PAZ, RIO BRAVO TAMPS', ruta: 2, orden: 22 },
  { cr: '50SC5', nombre: 'OXXO PLATA REX', ciudad: 'Reynosa', lat: 26.00189773442273, lng: -98.24258491165025, direccion: 'ESMERALDA VILLAS DE LA JOYA AMPLEACION REYNOSA', ruta: 1, orden: 22 },
  { cr: '50TSL', nombre: 'OXXO LAS PALMAS REX', ciudad: 'Reynosa', lat: 26.000979492460054, lng: -98.23017766747144, direccion: 'AVE PALMA GRANDE CON PALMA COCOTERA FRACC LAS PALMAS', ruta: 1, orden: 24 },
  { cr: '50V4X', nombre: 'OXXO MATAMOROS REX', ciudad: 'Rio Bravo', lat: 25.983568598361465, lng: -98.09778476932235, direccion: 'Matamoros esq. Av. Las Américas, Col. Cuahutemoc, Río Bravo, Tams.', ruta: 2, orden: 15 },
  { cr: '50XIU', nombre: 'OXXO GUERRERO REX', ciudad: 'Rio Bravo', lat: 25.983458331638673, lng: -98.08428773863629, direccion: 'AV.FRANCISCO I.MADERO#411 ESQ CON GRO.,FRACC.RIO BRAVO', ruta: 2, orden: 17 },
  { cr: '507UA', nombre: 'OXXO TLAXCALA REX', ciudad: 'Rio Bravo', lat: 25.99237961918914, lng: -98.09627135212868, direccion: 'CALLE: TLAXCALA #0 COL. BENITO JUAREZ, RIO BRAVO TAMPS', ruta: 2, orden: 12 },
  { cr: '50BCY', nombre: 'OXXO BRISAS DEL CAMPO REX', ciudad: 'Rio Bravo', lat: 25.996775069762368, lng: -98.06147926192061, direccion: 'REPUBLICA MEXICANA CON PALO DE ROSA NUM 1  COL BRISAS DEL CAMPO RIO BRAVO TAMPS', ruta: 2, orden: 26 },
  { cr: '50CIF', nombre: 'OXXO COLEGIO MILITAR REX', ciudad: 'Rio Bravo', lat: 25.988448848443504, lng: -98.11183986366538, direccion: 'FRANCISCO I MADERO  CON COLEGIO MILITAR  1455 COL  1 DE MAYO  ESQUINA HEROICO COLEGIO MILITAR', ruta: 2, orden: 5 },
  { cr: '50JGG', nombre: 'OXXO JALAPA REX', ciudad: 'Rio Bravo', lat: 25.983503498436296, lng: -98.08246736562162, direccion: 'AV. FRANCISCO I. MADERO ESQUINA CALLE JALAPA S/N C.P. 88900 COLONIA. RIO BRAVO CENTRO', ruta: 2, orden: 18 },
  { cr: '50LB0', nombre: 'OXXO CENTRAL RIO BRAVO REX', ciudad: 'Rio Bravo', lat: 25.98700123850861, lng: -98.09390798096463, direccion: 'AVENIDA FRANCISCO I MADERO, COLONIA ZONA CENTRO C.P 88933, RIO BRAVO, TAMAULIPAS', ruta: 2, orden: 13 },
  { cr: '50LIL', nombre: 'OXXO COLONIAL REX', ciudad: 'Reynosa', lat: 26.008551423590504, lng: -98.2065406404858, direccion: 'CARR. PUENTE PHARR, ENTRADA PARQ. COLONIAL', ruta: 1, orden: 26 },
  { cr: '50NAK', nombre: 'OXXO YUCATAN REX', ciudad: 'Rio Bravo', lat: 25.991283945754294, lng: -98.09030445212869, direccion: 'CALLE. YUCATAN ESQ. GUANAJUATO,SN  COL FRACC RIO BRAVO', ruta: 2, orden: 29 },
  { cr: '50NPR', nombre: 'OXXO NUEVO PROGRESO REX', ciudad: 'Rio Bravo', lat: 26.043574343577355, lng: -97.95237750331576, direccion: 'CARR. NUEVO PROG-RIO BRAVO KM3', ruta: 2, orden: 30 },
  { cr: '50NPS', nombre: 'OXXO NUEVO PROGRESO II REX', ciudad: 'Rio Bravo', lat: 26.05280855778013, lng: -97.95117587371024, direccion: 'AV B JUAREZ ESQ. REVOLUCION NVO PROG', ruta: 2, orden: 31 },
  { cr: '50OCW', nombre: 'OXXO OCEANO ATLANTICO REX', ciudad: 'Rio Bravo', lat: 26.00699551263749, lng: -98.06234924434045, direccion: 'GUANAJUATO ESQ.OCEANO ATLANTICO FRACC.LAS BRISAS RIO BRAVO', ruta: 2, orden: 27 },
  { cr: '50PIQ', nombre: 'OXXO PIRUL REX', ciudad: 'Rio Bravo', lat: 25.998301826765633, lng: -98.08889968281457, direccion: 'PUEBLA 110 COL MORELOS RIO BRAVO, TAMAULIPAS', ruta: 2, orden: 28 },
  { cr: '50RGJ', nombre: 'OXXO GUANAJUATO REX', ciudad: 'Rio Bravo', lat: 25.991844376239904, lng: -98.07439033493532, direccion: 'GUANAJUATO Y NARANJO COLONIA PARAISO', ruta: 2, orden: 21 },
  { cr: '50WTG', nombre: 'OXXO COAHUILA REX', ciudad: 'Rio Bravo', lat: 25.989792191208718, lng: -98.0817078502784, direccion: 'COAHUILA 601 ENTRE JALAPA Y SALTILLO FRACC. RIO BRAVO', ruta: 2, orden: 20 },
  { cr: '50X53', nombre: 'OXXO BARD REX', ciudad: 'Reynosa', lat: 25.997878554715218, lng: -98.20146551165037, direccion: 'Blvd. Montebello s/n entre chapultepec y bulevard pedregal, Parque industiral colonial', ruta: 1, orden: 27 },
  { cr: '50ZZH', nombre: 'OXXO CAMPANARIO REX', ciudad: 'Reynosa', lat: 25.984124975038842, lng: -98.19159355397923, direccion: 'AVE. RENE SALINAS S/N ESQ. MAYNERO, FRACC. CAMPANARIO', ruta: 1, orden: 29 },
  { cr: '50ZZJ', nombre: 'OXXO CHAPULTEPEC REX', ciudad: 'Reynosa', lat: 25.983573540935783, lng: -98.2007086145382, direccion: 'AV CHAPULTEPEC ESQ DON RENE SALINAS COL.FRACC EL CAMPANARIO', ruta: 1, orden: 28 },
  { cr: '50ZZR', nombre: 'OXXO MAQUILADORAS REX', ciudad: 'Reynosa', lat: 26.003945844694524, lng: -98.21433169260644, direccion: 'BRECHA 99 ESQ. DATACOM FRACC. INDUSTRIAL MAQUILADORAS', ruta: 1, orden: 25 },
  { cr: '506PN', nombre: 'OXXO BRECHA 108 REX', ciudad: 'Rio Bravo', lat: 25.994478824967473, lng: -98.118771069322, direccion: 'Brecha 108 S/N, Colonia Ferrocarril 4, Rio Bravo Tamaulipas', ruta: 2, orden: 3 },
  { cr: '50BSH', nombre: 'OXXO BRECHA REX', ciudad: 'Rio Bravo', lat: 25.986090972134217, lng: -98.1184196846653, direccion: 'BRECHA 109 S/N, COL. 1ro. MAYO, RIO BRAVO TAM.', ruta: 2, orden: 9 },
  { cr: '50I65', nombre: 'OXXO COMETA REX', ciudad: 'Rio Bravo', lat: 26.000748565315803, lng: -98.12102068096422, direccion: 'CALLE COMETA ESQUINA COLUMBIA FRACC. SATELITE RIO BRAVO TAMPS', ruta: 2, orden: 2 },
  { cr: '50KC6', nombre: 'OXXO ALLENDE REX', ciudad: 'Rio Bravo', lat: 25.988752916617933, lng: -98.12410676747184, direccion: 'CARR. MATAMOROS REYNOSA ESQ, ALLENDE COL. JUAN BAEZ GUERRA C.D RIO BRAVO', ruta: 2, orden: 10 },
  { cr: '50ONX', nombre: 'OXXO ONIX REX', ciudad: 'Reynosa', lat: 26.01439558844906, lng: -98.24352356747107, direccion: 'Calle: Ave, La Joya, Entre Calle: Ónix Col. La Joya C.P 88777, Reynosa, Tamaulipas', ruta: 1, orden: 4 },
  { cr: '50QZT', nombre: 'OXXO SATELITE REX', ciudad: 'Reynosa', lat: 26.012958332420354, lng: -98.26199898096381, direccion: 'JOSE MARIA MORELOS ESQUINA  CALLE 26 DE NOVIEMBRE 1500 88795 SATELITE REYNOSA REYNOSA TAMAULIPAS', ruta: 1, orden: 12 },
  { cr: '50RKB', nombre: 'OXXO RUIZ CORTINEZ REX', ciudad: 'Reynosa', lat: 26.01911892922084, lng: -98.26149272992718, direccion: 'RUIZ CORTINEZ ENTRE ESQUINA CALLE 21 NO. 968  S/N C.P. 88799 COLONIA. PEDRO J MENDEZ 1RA SECC', ruta: 1, orden: 10 },
  { cr: '50W87', nombre: 'OXXO AZTECA REX', ciudad: 'Rio Bravo', lat: 26.00617689992734, lng: -98.121826280964, direccion: 'CALLE SATELITE ESQUINA AMEYAL FRACC. AZTECA RIO BRAVO, TAM.', ruta: 2, orden: 1 },
  { cr: '50XNW', nombre: 'OXXO GUINDA REX', ciudad: 'Reynosa', lat: 26.026885907728076, lng: -98.27074464842691, direccion: 'C: CRISTAL ESQUINA CALLE GUINDA COL ARCOIRIS', ruta: 3, orden: 10 },
  { cr: '50ZDS', nombre: 'OXXO EMILIANO ZAPATA REX', ciudad: 'Reynosa', lat: 26.012809332640728, lng: -98.24695090794923, direccion: 'CALLE MIGUEL ANGEL ESQUINA CON CALLE GRAL. EMILIANO ZAPATA S/N C.P. 88777  COLONIA. LA JOYA  REYNOSA, TMPS.', ruta: 1, orden: 5 },
  { cr: '502TD', nombre: 'OXXO 24 DE FEBRERO REX', ciudad: 'Reynosa', lat: 26.041556767425053, lng: -98.29218823678409, direccion: 'CALLE 24 DE FEBRERO ESQUINA CALLE NOHELIA COL. PRESA DE LA LAGUNA, REYNOSA TAMPS', ruta: 3, orden: 8 },
  { cr: '50M80', nombre: 'OXXO FRANCISCO I. MADERO REX', ciudad: 'Rio Bravo', lat: 25.98727310672226, lng: -98.10728137612595, direccion: 'Avenida Francisco I. Madero 1123 esq. Calle Tamaulipas, Colonia Rio Bravo 1, Cd. Rio Bravo, Tamaulipas', ruta: 2, orden: 6 },
  { cr: '50BZ4', nombre: 'OXXO LUCIO BLANCO REX', ciudad: 'Reynosa', lat: 26.016672626927207, lng: -98.2543433791134, direccion: 'CALLE 5 DE MAYO ESQ CON PRIMERO DE MAYO COL SATELITE', ruta: 1, orden: 9 },
  { cr: '50K8S', nombre: 'OXXO LAS LIEBRES REX', ciudad: 'Rio Bravo', lat: 25.97856211454783, lng: -98.08472715212909, direccion: 'LIBERTAD 405, FRAC 3, RIO BRAVO TAMAULIPAS CP 88959', ruta: 2, orden: 19 },
  { cr: '5073P', nombre: 'OXXO ABASOLO REX', ciudad: 'Rio Bravo', lat: 25.982047056119857, lng: -98.09462706747203, direccion: 'MORELOS 227, FRACCIONAMIENTO 3, RIO BRAVO TAMAULIPAS, C.P. 88959,', ruta: 2, orden: 14 },
  { cr: '50B19', nombre: 'OXXO 16 DE SEPTIEMBRE REX', ciudad: 'Rio Bravo', lat: 25.99005924165304, lng: -98.09988360980027, direccion: '5 DE MAYO SN, COL BENITO JUAREZ, RIO BRAVO TAMAULIPAS', ruta: 2, orden: 11 },
  { cr: '502SW', nombre: 'OXXO AGENCIAS ADUANALES REX', ciudad: 'Reynosa', lat: 26.041055844181916, lng: -98.21510477620961, direccion: 'Blvd. Luis Donaldo Colosio 0, PARQUE INDUSTRIAL REYNOSA (SECCION NORTE), Reynosa, Tamaulipas, C.P. 88788', ruta: 1, orden: 35 },
  { cr: '50HR6', nombre: 'OXXO DE LOS LAGOS REX', ciudad: 'Reynosa', lat: 26.00468209393402, lng: -98.25177039340183, direccion: 'Bulevard Villas Esmeralda , *VILLA ESMERALDA,Reynosa, Tamaulipas, C.P. 88795', ruta: 1, orden: 17 },
  { cr: '500GN', nombre: 'OXXO FCO NICODEMO REX', ciudad: 'Reynosa', lat: 26.033879902704932, lng: -98.26912199630624, direccion: 'Porfirio Diaz sn, La Escondida, Reynosa, Tamaulipas, C.P. 88770', ruta: 2, orden: 34 },
  { cr: '502TV', nombre: 'OXXO GAS VALEO REX', ciudad: 'Rio Bravo', lat: 25.976549351376033, lng: -98.05935048096492, direccion: 'Av. Francisco I. Madero 0, AGAPITO BARRERA Río Bravo, Tamaulipas, C.P. 88930', ruta: 2, orden: 23 },
  { cr: '505UE', nombre: 'OXXO INDEPENDENCIA REX', ciudad: 'Reynosa', lat: 26.05018367633207, lng: -98.31407210374124, direccion: 'Ignacio de la Garza na, *LAS FUENTES SECCION LOMAS,Reynosa, Tamaulipas, C.P. 88703', ruta: 3, orden: 36 },
  { cr: '50V9G', nombre: 'OXXO RODHE REX', ciudad: 'Reynosa', lat: 26.03873119428828, lng: -98.29990605397757, direccion: 'Rio Purificacion na, *BALCONES DE ALCALA, Reynosa, Tamaulipas, C.P. 88799', ruta: 3, orden: 4 },
  { cr: '501J5', nombre: 'OXXO SAN FRANCISCO REX', ciudad: 'Reynosa', lat: 25.97262160070187, lng: -98.28995737210126, direccion: 'Av. San Martin sn, *BALCONES DE ALCALA, Reynosa, Tamaulipas, C.P. 88799', ruta: 3, orden: 43 },
  { cr: '50C35', nombre: 'OXXO SUR 2 REX', ciudad: 'Rio Bravo', lat: 25.983644520119157, lng: -98.11095149630773, direccion: 'Heroico Colegio Militar 439, RIO BRAVO, Río Bravo, Tamaulipas, C.P. 88930', ruta: 2, orden: 8 },
  { cr: '50I1V', nombre: 'OXXO RIO RHIN MTY REX', ciudad: 'Reynosa', lat: 26.004888300313066, lng: -98.25872331735543, direccion: 'Boulevard Alcalá SN, Balcones de Alcalá, Reynosa, Tamaulipas, C.P. 88799,', ruta: 1, orden: 14 },
  { cr: '508KX', nombre: 'OXXO ROMULO MTY REX', ciudad: 'Reynosa', lat: 26.03427000089132, lng: -98.2358353576784, direccion: 'Av. 20 de Noviembre 410, ALMAGUER, Reynosa, Tamaulipas, C.P. 88780,', ruta: 1, orden: 33 },
  { cr: '50INX', nombre: 'OXXO INGLATERRA REX', ciudad: 'Reynosa', lat: 26.059814563068414, lng: -98.3082075619186, direccion: 'CALLE PEKIN 400 COL  CAÑADA', ruta: 3, orden: 25 },
  { cr: '50JNO', nombre: 'OXXO JARACHINA NTE REX', ciudad: 'Reynosa', lat: 26.051221548828018, lng: -98.34831565027649, direccion: 'CIRUELOS  Num 100  COL.JARACHINA NORTE', ruta: 3, orden: 42 },
  { cr: '50AVB', nombre: 'OXXO MODULO 2000 REX', ciudad: 'Reynosa', lat: 26.068361027577815, lng: -98.30493409838574, direccion: 'AV. MIGUEL ALEMAN S/N, COL. MODULO 2000', ruta: 3, orden: 32 },
  { cr: '505BX', nombre: 'OXXO NOVENA REX', ciudad: 'Reynosa', lat: 26.06900467149233, lng: -98.31374123547319, direccion: 'CALLE: 9NA S/N COL. LAS FUENTES SECC AZTLAN,  REYNOSA TAMAULIPAS', ruta: 3, orden: 28 },
  { cr: '50TEF', nombre: 'OXXO ORIENTE 2 REX', ciudad: 'Reynosa', lat: 26.06740387684935, lng: -98.32403790424681, direccion: 'ORIENTE DOS S/N ENTRE CALLES AV NORTE 2 C.P. 88740 COL. LAS CUMBRES', ruta: 3, orden: 41 },
  { cr: '50PEK', nombre: 'OXXO PEKIN REX', ciudad: 'Reynosa', lat: 26.06051818044645, lng: -98.31288540992347, direccion: 'CALLE PEKIN(ANTES CALLE 20) ESQ SIERRA LEONA', ruta: 3, orden: 34 },
  { cr: '5060K', nombre: 'OXXO SIERRA LEONA REX', ciudad: 'Reynosa', lat: 26.056445344840647, lng: -98.31465505027633, direccion: 'CALLE: TRES PICOS S/N COL. LAS FUENTES COLONIAL REYNOSA TAMAULIPAS', ruta: 3, orden: 35 },
  { cr: '50MYF', nombre: 'OXXO SUR TRES REX', ciudad: 'Reynosa', lat: 26.05580941523826, lng: -98.32755567726173, direccion: 'BLV MIL CUMBRES ESQ CALLE SUR TRES COLONIA CUMBRES CP.88740 Cd. Reynosa, Tamaulipas', ruta: 3, orden: 38 },
  { cr: '50UXU', nombre: 'OXXO SUR UNO REX', ciudad: 'Reynosa', lat: 26.06048346207758, lng: -98.32707939260463, direccion: 'V. CUMBRES Y ESQUINA AVENIDA SUR UNO No. 974 C.P.88740 COL. LAS CUMBRES', ruta: 3, orden: 39 },
  { cr: '50PPX', nombre: 'OXXO TRES PICOS REX', ciudad: 'Reynosa', lat: 26.05130000791814, lng: -98.32160293943102, direccion: 'CIRCUITO INDEPENDENCIA ESQ. TRES PICOS FRACC. FUENTES SECCION LOMAS', ruta: 3, orden: 37 },
  { cr: '50L8F', nombre: 'OXXO Pirámides REX', ciudad: 'Reynosa', lat: 25.94437182890723, lng: -98.26214216747321, direccion: 'Av de los Faraones, Lote 1 Las Pirámides, Reynosa Tam', ruta: 1, orden: 41 },
]

interface Folio {
  id: string
  tienda_nombre: string
  prioridad: string
  estatus: string
  numero_folio: string
  fecha_vencimiento: string
}

function secsLeft(fecha: string): number {
  return Math.floor((new Date(fecha).getTime() - Date.now()) / 1000)
}

function formatCountdown(secs: number): string {
  if (secs <= 0) {
    const abs = Math.abs(secs)
    const h = Math.floor(abs / 3600)
    const m = Math.floor((abs % 3600) / 60)
    const s = abs % 60
    return `VENCIDO hace ${h > 0 ? h + "h " : ""}${m}m ${s}s`
  }
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 24) return `${Math.floor(h/24)}d ${h%24}h restantes`
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
}

function getUrgencia(folios: Folio[]): "critico" | "urgente" | "proximo" | "normal" | "sinfolios" {
  if (folios.length === 0) return "sinfolios"
  const minSecs = Math.min(...folios.map(f => secsLeft(f.fecha_vencimiento)))
  if (minSecs <= 0) return "critico"
  if (minSecs < 3600) return "urgente"
  if (minSecs < 21600) return "proximo"
  return "normal"
}

function getMarkerHTML(count: number, urgencia: string, rutaColor: string, tick: number): string {
  let color = rutaColor + (count === 0 ? "66" : "")
  let border = "2px solid white"
  let size = count > 0 ? 14 : 10
  let pulso = ""

  if (urgencia === "critico") {
    color = "#ef4444"
    border = "2px solid white"
    size = 16
    // Parpadeo: alterna opacidad según tick
    const op = tick % 2 === 0 ? "1" : "0.3"
    pulso = `opacity:${op};`
  } else if (urgencia === "urgente") {
    color = "#ef4444"
    size = 15
    const scale = tick % 2 === 0 ? "1" : "1.3"
    pulso = `transform:scale(${scale});`
  } else if (urgencia === "proximo") {
    color = "#f97316"
  }

  const dot = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.6);transition:all 0.3s;${pulso}"></div>`

  if (count > 0) {
    return `<div style="position:relative;display:inline-block">${dot}<div style="position:absolute;top:-9px;right:-9px;background:#0f172a;color:white;border-radius:8px;font-size:9px;font-weight:bold;padding:1px 4px;border:1.5px solid ${color};min-width:14px;text-align:center;line-height:13px">${count}</div></div>`
  }
  return dot
}

export default function MapaPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [folios, setFolios] = useState<Folio[]>([])
  const [filtroRuta, setFiltroRuta] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [vistaLista, setVistaLista] = useState(false)
  const [tick, setTick] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    supabase.from("folios")
      .select("id,tienda_nombre,prioridad,estatus,numero_folio,fecha_vencimiento")
      .neq("estatus", "Cerrado")
      .then(({ data }) => { if (data) setFolios(data) })
    setMapReady(true)

    // Actualizar cada segundo para countdown y parpadeo
    const interval = setInterval(() => {
      setTick(t => t + 1)
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [supabase])

  const storeMap = useMemo(() => {
    const m: Record<string, Folio[]> = {}
    folios.forEach(f => {
      const key = f.tienda_nombre.toLowerCase().replace(/oxxo\s*/i,"").replace(/\s*rex\s*/i,"").trim()
      if (!m[key]) m[key] = []
      m[key].push(f)
    })
    return m
  }, [folios])

  const getFolios = useCallback((nombre: string): Folio[] => {
    const key = nombre.toLowerCase().replace(/oxxo\s*/i,"").replace(/\s*rex\s*/i,"").trim()
    for (const [k, v] of Object.entries(storeMap)) {
      if (k.includes(key) || key.includes(k)) return v
    }
    return []
  }, [storeMap])

  const tiendasFiltradas = filtroRuta === 0 ? TIENDAS : TIENDAS.filter(t => t.ruta === filtroRuta)
  const tiendasOrdenadas = [...tiendasFiltradas].sort((a, b) => a.ruta !== b.ruta ? a.ruta - b.ruta : a.orden - b.orden)
  const center: [number, number] = filtroRuta === 2 ? [25.99, -98.09] : [26.03, -98.27]
  const zoom = filtroRuta === 0 ? 11 : 13
  const counts = [1,2,3].map(r => TIENDAS.filter(t => t.ruta === r).length)
  const rutasParaLista = filtroRuta === 0 ? [1, 2, 3] : [filtroRuta]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <MapPin size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Mapa Operativo</h1>
            <p className="text-dark-400 text-sm">{TIENDAS.length} tiendas · 3 rutas · 42/42/43</p>
          </div>
        </div>
        <button onClick={() => setVistaLista(!vistaLista)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-800 text-dark-300 border border-dark-600 hover:bg-dark-700">
          {vistaLista ? <><Map size={13}/> Ver Mapa</> : <><List size={13}/> Ver Lista</>}
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button onClick={() => setFiltroRuta(0)}
          className={`card p-3 text-center border-2 transition-all ${filtroRuta === 0 ? "border-white/30 bg-dark-700" : "border-transparent"}`}>
          <div className="text-xl font-black text-white">{TIENDAS.length}</div>
          <div className="text-xs text-dark-400 mt-0.5">Todas</div>
        </button>
        {[1,2,3].map(r => (
          <button key={r} onClick={() => setFiltroRuta(r)}
            style={{ borderColor: filtroRuta === r ? RUTA_COLORS[r] : "transparent" }}
            className="card p-3 text-center border-2 transition-all">
            <div className="text-xl font-black" style={{ color: RUTA_COLORS[r] }}>{counts[r-1]}</div>
            <div className="text-xs text-dark-400 mt-0.5">{RUTA_EMOJIS[r]} {RUTA_NAMES[r]}</div>
          </button>
        ))}
      </div>

      {/* Leyenda con parpadeo */}
      <div className="card p-3 flex gap-4 text-xs flex-wrap items-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" style={{ opacity: tick % 2 === 0 ? 1 : 0.3, transition: "opacity 0.3s" }}/>
          Vencido (parpadea)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" style={{ transform: tick % 2 === 0 ? "scale(1)" : "scale(1.3)", transition: "transform 0.3s" }}/>
          Urgente &lt;1h
        </span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"/>Próximo &lt;6h</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{background:"#22c55e"}}/>R1</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{background:"#3b82f6"}}/>R2</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{background:"#f97316"}}/>R3</span>
      </div>

      {/* MAPA */}
      {!vistaLista && mapReady && (
        <div className="rounded-xl overflow-hidden border border-dark-700" style={{ height: "480px" }}>
          <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
            {tiendasFiltradas.map(t => {
              const tFolios = getFolios(t.nombre)
              const urgencia = getUrgencia(tFolios)
              const html = getMarkerHTML(tFolios.length, urgencia, RUTA_COLORS[t.ruta], tick)
              const sz = tFolios.length > 0 ? 23 : 10
              const icon = typeof window !== "undefined"
                ? new (require("leaflet").DivIcon)({
                    html,
                    className: "",
                    iconSize: [sz, sz],
                    iconAnchor: [sz/2, sz/2],
                  })
                : undefined

              // Ordenar folios por urgencia para mostrar primero el más crítico
              const foliosOrdenados = [...tFolios].sort((a, b) =>
                secsLeft(a.fecha_vencimiento) - secsLeft(b.fecha_vencimiento)
              )

              return (
                <Marker key={`${t.cr}-${tick}`} position={[t.lat, t.lng]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: "230px", fontFamily: "sans-serif" }}>
                      <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "2px" }}>{t.nombre}</div>
                      <div style={{ fontSize: "10px", color: "#888", marginBottom: "6px" }}>
                        CR: {t.cr} · {RUTA_EMOJIS[t.ruta]} Ruta {t.ruta} · Parada #{t.orden}
                      </div>

                      {tFolios.length === 0
                        ? <div style={{ color: "#22c55e", fontSize: "12px" }}>✓ Sin folios activos</div>
                        : foliosOrdenados.map((f, idx) => {
                          const secs = secsLeft(f.fecha_vencimiento)
                          const esVencido = secs <= 0
                          const esUrgente = secs > 0 && secs < 3600
                          const esProximo = secs >= 3600 && secs < 21600
                          const countdownColor = esVencido ? "#ef4444" : esUrgente ? "#f97316" : esProximo ? "#eab308" : "#22c55e"
                          const prioColor = f.prioridad === "ALTA" ? "#ef4444" : f.prioridad === "MEDIA" ? "#f97316" : "#60a5fa"

                          return (
                            <div key={f.id} style={{
                              marginBottom: "8px",
                              padding: "6px 8px",
                              background: idx === 0 ? "#1e293b" : "#0f172a",
                              borderRadius: "6px",
                              borderLeft: `3px solid ${prioColor}`,
                            }}>
                              {idx === 0 && (
                                <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "2px", fontWeight: "bold" }}>
                                  ⚡ ATENDER PRIMERO
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: "bold", color: prioColor }}>{f.prioridad}</span>
                                <span style={{ fontSize: "10px", color: "#94a3b8" }}>#{f.numero_folio}</span>
                              </div>
                              <div style={{
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: countdownColor,
                                marginTop: "3px",
                                fontFamily: "monospace",
                              }}>
                                ⏱ {formatCountdown(secs)}
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      )}

      {/* LISTA POR CERCANÍA */}
      <div className="space-y-4">
        {rutasParaLista.map(r => {
          const rutaTiendas = tiendasOrdenadas.filter(t => t.ruta === r)
          return (
            <div key={r} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold" style={{ color: RUTA_COLORS[r] }}>
                  {RUTA_EMOJIS[r]} Ruta {r} — {RUTA_NAMES[r]}
                </span>
                <span className="text-xs text-dark-500">({rutaTiendas.length} tiendas · orden por cercanía)</span>
              </div>
              <div className="space-y-1">
                {rutaTiendas.map(t => {
                  const tFolios = getFolios(t.nombre)
                  const foliosOrdenados = [...tFolios].sort((a, b) => secsLeft(a.fecha_vencimiento) - secsLeft(b.fecha_vencimiento))
                  const masUrgente = foliosOrdenados[0]
                  const urgencia = getUrgencia(tFolios)
                  const isParpadeo = urgencia === "critico" && tick % 2 === 0

                  return (
                    <div key={t.cr}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                      style={{
                        background: urgencia === "critico"
                          ? isParpadeo ? "#ef444415" : "#ef444430"
                          : urgencia === "urgente" ? "#f9731615"
                          : "#0f172a",
                        borderLeft: tFolios.length > 0 ? `3px solid ${urgencia === "critico" || urgencia === "urgente" ? "#ef4444" : urgencia === "proximo" ? "#f97316" : RUTA_COLORS[r]}` : "3px solid transparent",
                      }}>
                      <span className="text-xs font-mono text-dark-500 w-6 text-right flex-shrink-0">{t.orden}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-dark-100 truncate">{t.nombre}</span>
                          {tFolios.length > 0 && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{
                                color: urgencia === "critico" || urgencia === "urgente" ? "#ef4444" : urgencia === "proximo" ? "#f97316" : "#22c55e",
                                background: urgencia === "critico" || urgencia === "urgente" ? "#ef444420" : urgencia === "proximo" ? "#f9731620" : "#22c55e20",
                              }}>
                              {tFolios.length} folio{tFolios.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {masUrgente && (
                          <div className="text-xs font-mono mt-0.5"
                            style={{ color: secsLeft(masUrgente.fecha_vencimiento) <= 0 ? "#ef4444" : secsLeft(masUrgente.fecha_vencimiento) < 3600 ? "#f97316" : "#94a3b8" }}>
                            ⏱ {formatCountdown(secsLeft(masUrgente.fecha_vencimiento))} · {masUrgente.prioridad} #{masUrgente.numero_folio}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

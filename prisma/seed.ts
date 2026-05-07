/**
 * Datos de demostración completos para Direct Planning / Nextmedia.
 * Contraseña común (todos los usuarios seed): Demostracion1
 *
 * Ejecutar: npx prisma db seed   o   npm run db:seed
 */
import {
  BookingGranularity,
  InventoryFormat,
  InventoryStatus,
  PriceModel,
  Prisma,
  PrismaClient,
  ReservationStatus,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Demostracion1";

const SEED_EMAILS = [
  /* proveedores */
  "demo.medio.caba@ejemplo.ar",
  "demo.medio.subte@ejemplo.ar",
  "demo.medio.interior@ejemplo.ar",
  "demo.medio.palermo@ejemplo.ar",
  "demo.medio.gba@ejemplo.ar",
  "demo.medio.rosario@ejemplo.ar",
  "demo.medio.cordoba@ejemplo.ar",
  "demo.medio.mendoza@ejemplo.ar",
  "demo.medio.mdp@ejemplo.ar",
  "demo.medio.premium@ejemplo.ar",
  /* anunciantes */
  "demo.anunciante@ejemplo.ar",
  "demo.pyme@ejemplo.ar",
  "demo.agencia@ejemplo.ar",
  /* admin */
  "demo.admin@ejemplo.ar",
] as const;

async function clearSeedUsers() {
  await prisma.user.deleteMany({ where: { email: { in: [...SEED_EMAILS] } } });
}

function d(amount: string) {
  return new Prisma.Decimal(amount);
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 12);
  await clearSeedUsers();

  /* ── USUARIOS ─────────────────────────────────────────────────────────── */

  const [
    provCaba, provSubte, provInterior,
    provPalermo, provGba, provRosario,
    provCordoba, provMendoza, provMdp, provPremium,
    adv1, adv2, adv3,
  ] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: "demo.medio.caba@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Wall Street Digital",
            description: "Red de pantallas LED en microcentro y Av. Corrientes. Líder en CABA.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.subte@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Vía Subte Media",
            description: "Inventario exclusivo en estaciones y pasillos de combinación. +1M pasajeros/día.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.interior@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Metrópoli Interior",
            description: "Red de vallas y digitales en ciudades clave del interior: Córdoba, Rosario, Tucumán.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.palermo@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Palermo Digital",
            description: "Pantallas en el corredor gastronómico y cultural de Palermo. Audiencia premium 25-45.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.gba@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "GBA Outdoor",
            description: "Cobertura total en el corredor Norte y Oeste del GBA. Accesos y rutas principales.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.rosario@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Rosario Vía Pública",
            description: "Red digital y estática en Rosario, segunda ciudad del país. Costa y centro.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.cordoba@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Córdoba Pantallas",
            description: "Inventario digital en la Ciudad de las Artes, Nueva Córdoba y accesos a la ciudad.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.mendoza@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Cuyo Media Outdoor",
            description: "Líder en publicidad exterior en Mendoza. Rutas de montaña, bodegas y microcentro.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.mdp@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Mar del Plata Outdoor",
            description: "Pantallas y vallas en la principal ciudad turística costera. Temporada alta y baja.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.medio.premium@ejemplo.ar",
        passwordHash,
        role: UserRole.provider,
        providerProfile: {
          create: {
            companyName: "Nexus Premium OOH",
            description: "Espacios de alto impacto en aeropuertos, shoppings premium y autopistas de acceso.",
          },
        },
      },
      include: { providerProfile: true },
    }),
    prisma.user.create({
      data: {
        email: "demo.anunciante@ejemplo.ar",
        passwordHash,
        role: UserRole.advertiser,
        advertiserProfile: { create: { legalName: "Marca Demo S.A." } },
      },
    }),
    prisma.user.create({
      data: {
        email: "demo.pyme@ejemplo.ar",
        passwordHash,
        role: UserRole.advertiser,
        advertiserProfile: { create: { legalName: "Pyme Local SRL" } },
      },
    }),
    prisma.user.create({
      data: {
        email: "demo.agencia@ejemplo.ar",
        passwordHash,
        role: UserRole.advertiser,
        advertiserProfile: { create: { legalName: "Agencia 360 Publicidad" } },
      },
    }),
    prisma.user.create({
      data: {
        email: "demo.admin@ejemplo.ar",
        passwordHash,
        role: UserRole.admin,
      },
    }),
  ]);

  const pCaba    = provCaba.providerProfile!;
  const pSubte   = provSubte.providerProfile!;
  const pInt     = provInterior.providerProfile!;
  const pPalermo = provPalermo.providerProfile!;
  const pGba     = provGba.providerProfile!;
  const pRosario = provRosario.providerProfile!;
  const pCordoba = provCordoba.providerProfile!;
  const pMendoza = provMendoza.providerProfile!;
  const pMdp     = provMdp.providerProfile!;
  const pPremium = provPremium.providerProfile!;

  /* ── UNIDADES DE INVENTARIO ───────────────────────────────────────────── */

  const units = await prisma.inventoryUnit.createManyAndReturn({
    data: [

      /* ── WALL STREET DIGITAL (CABA microcentro) ── */
      {
        providerId: pCaba.id,
        name: "LED Obelisco — paseo lateral",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, San Nicolás — zona Obelisco",
        description: "Pantalla LED de gran formato frente al Obelisco, el punto de mayor tráfico y visibilidad de Buenos Aires. Ideal para lanzamientos de producto con cobertura masiva en el corazón de la ciudad.",
        latitude: -34.6037, longitude: -58.3816,
        basePriceAmount: d("280000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pCaba.id,
        name: "Pantalla Av. Corrientes y Florida",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Microcentro",
        description: "Esquina de alto impacto en el cruce comercial más transitado de Buenos Aires. Miles de peatones y turistas a diario. Perfecta para marcas de retail, entretenimiento y finanzas.",
        latitude: -34.6033, longitude: -58.3748,
        basePriceAmount: d("195000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.day,
        status: InventoryStatus.published,
      },
      {
        providerId: pCaba.id,
        name: "LED Diagonal Norte — frente al Congreso",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Monserrat",
        description: "Pantalla frente al Congreso Nacional sobre Diagonal Norte. Audiencia de ejecutivos, periodistas y turistas. Alta visibilidad en horario pico mañana y tarde.",
        latitude: -34.6092, longitude: -58.3929,
        basePriceAmount: d("210000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pCaba.id,
        name: "Pantalla Av. 9 de Julio Norte",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Recoleta",
        description: "Pantalla de 14m² sobre la avenida más ancha del mundo, tramo norte. Impacto visual desde 200 metros. Audiencia de segmento ABC1 en el corredor Recoleta-Palermo.",
        latitude: -34.5973, longitude: -58.3822,
        basePriceAmount: d("320000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pCaba.id,
        name: "Valla estática Av. del Libertador km 2",
        format: InventoryFormat.static_ooh,
        locationLabel: "CABA, Palermo — Av. del Libertador",
        description: "Valla iluminada de 48m² sobre la Av. del Libertador frente a la embajada americana. Sector premium de alto tránsito vehicular ABC1.",
        latitude: -34.5775, longitude: -58.4217,
        basePriceAmount: d("145000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pCaba.id,
        name: "Pack centro histórico — 3 pantallas",
        format: InventoryFormat.digital_package,
        locationLabel: "CABA, San Telmo y Monserrat",
        description: "Paquete de 3 pantallas LED coordinadas en el circuito turístico de San Telmo y el Casco Histórico. Incluye fines de semana con público local y turismo receptivo.",
        basePriceAmount: d("380000"),
        priceModel: PriceModel.package,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── VÍA SUBTE MEDIA ── */
      {
        providerId: pSubte.id,
        name: "Digital Subte Línea B — Carlos Pellegrini",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Subte Línea B, estación Carlos Pellegrini — CABA",
        description: "Pantalla en el andén de combinación más transitada de la red. +80.000 pasajeros diarios en hora pico. Contactos frecuentes de clase media profesional.",
        latitude: -34.6041, longitude: -58.3803,
        basePriceAmount: d("95000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pSubte.id,
        name: "Digital Línea D — Palermo",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Subte Línea D, estación Palermo — CABA",
        description: "Pantalla en andén de la estación Palermo, nodo clave del corredor norte. Audiencia joven y profesional que conecta con el barrio gastronómico y las oficinas de Belgrano.",
        latitude: -34.5811, longitude: -58.4218,
        basePriceAmount: d("85000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pSubte.id,
        name: "Digital Línea A — Plaza Miserere",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Subte Línea A, estación Plaza Miserere — CABA",
        description: "Pantalla en uno de los accesos más transitados de la línea A. Alta afluencia de trabajadores del sector textil, comercio y servicios del Barrio Once.",
        latitude: -34.6087, longitude: -58.4021,
        basePriceAmount: d("72000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pSubte.id,
        name: "Pack pasillos combinación Obelisco",
        format: InventoryFormat.digital_package,
        locationLabel: "Subte, combinación 9 de Julio — CABA",
        description: "Paquete exclusivo de 8 pantallas en los pasillos de combinación C-D-E bajo el Obelisco. El punto de mayor afluencia de toda la red con más de 200.000 impactos diarios garantizados.",
        basePriceAmount: d("420000"),
        priceModel: PriceModel.package,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pSubte.id,
        name: "Digital Línea H — Corrientes",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Subte Línea H, estación Corrientes — CABA",
        description: "La línea H es la más moderna de la red con pantallas de alta resolución. Estación Corrientes conecta con el circuito cultural nocturno de la avenida más célebre de Argentina.",
        latitude: -34.6046, longitude: -58.3910,
        basePriceAmount: d("78000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── PALERMO DIGITAL ── */
      {
        providerId: pPalermo.id,
        name: "LED Honduras y Thames — Palermo Soho",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Palermo Soho",
        description: "Pantalla en la esquina icónica del polo gastronómico de Palermo Soho. Audiencia premium de jóvenes profesionales 25-40, turismo internacional y moda. El lugar donde se instalan las marcas aspiracionales.",
        latitude: -34.5873, longitude: -58.4298,
        basePriceAmount: d("165000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pPalermo.id,
        name: "Pantalla Santa Fe y Coronel Díaz",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Palermo — Av. Santa Fe",
        description: "Pantalla sobre Av. Santa Fe en el corazón de Palermo. Corredor de tiendas y restaurantes con tráfico constante de compradores y turistas. Ideal para retail y lifestyle.",
        latitude: -34.5830, longitude: -58.4169,
        basePriceAmount: d("140000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.day,
        status: InventoryStatus.published,
      },
      {
        providerId: pPalermo.id,
        name: "Valla Hipódromo — frente MALBA",
        format: InventoryFormat.static_ooh,
        locationLabel: "CABA, Palermo — Av. Figueroa Alcorta",
        description: "Valla panorámica de 36m² frente al MALBA en la Av. Figueroa Alcorta. Sector de museos, embajadas y tránsito vehicular de segmento ABC1. Visibilidad todo el día.",
        latitude: -34.5756, longitude: -58.4198,
        basePriceAmount: d("175000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pPalermo.id,
        name: "Pack Palermo Hollywood — 2 pantallas",
        format: InventoryFormat.digital_package,
        locationLabel: "CABA, Palermo Hollywood",
        description: "Dos pantallas coordinadas en el barrio de las productoras y medios de comunicación. Audiencia creativa y publicitaria de lunes a viernes. Perfecta para marcas de tecnología y entretenimiento.",
        latitude: -34.5837, longitude: -58.4381,
        basePriceAmount: d("260000"),
        priceModel: PriceModel.package,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── GBA OUTDOOR ── */
      {
        providerId: pGba.id,
        name: "LED Autopista Panamericana km 28",
        format: InventoryFormat.digital_ooh,
        locationLabel: "GBA Norte, Panamericana — Zona Norte",
        description: "Pantalla LED de 20m² sobre la Panamericana en el tramo de mayor tránsito del corredor norte. +150.000 vehículos diarios. Audiencia ABC1 que se desplaza entre capital y zona norte.",
        latitude: -34.4478, longitude: -58.5684,
        basePriceAmount: d("230000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pGba.id,
        name: "Valla Ruta 2 — entrada a La Plata",
        format: InventoryFormat.static_ooh,
        locationLabel: "GBA Sur, Ruta Nacional 2 — acceso La Plata",
        description: "Valla de 48m² en el acceso principal a La Plata sobre la ruta 2. Tránsito constante de turistas, estudiantes universitarios y trabajadores del conurbano sur.",
        latitude: -34.8018, longitude: -57.9964,
        basePriceAmount: d("85000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pGba.id,
        name: "Digital Acceso Oeste — Morón",
        format: InventoryFormat.digital_ooh,
        locationLabel: "GBA Oeste, Autopista del Oeste — Morón",
        description: "Pantalla sobre el Acceso Oeste a la altura de Morón. Corredor de alto volumen hacia el interior de la provincia. Audiencia trabajadora y familiar del conurbano oeste.",
        latitude: -34.6524, longitude: -58.6215,
        basePriceAmount: d("115000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pGba.id,
        name: "Pantalla Nordelta — Av. de los Lagos",
        format: InventoryFormat.digital_ooh,
        locationLabel: "GBA Norte, Nordelta — Tigre",
        description: "Pantalla en la entrada al barrio privado más grande del país. Audiencia ABC1 exclusiva de familias con alto poder adquisitivo. Contacto diario con los 30.000 residentes del complejo.",
        latitude: -34.3975, longitude: -58.6789,
        basePriceAmount: d("180000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── ROSARIO VÍA PÚBLICA ── */
      {
        providerId: pRosario.id,
        name: "LED Av. Córdoba y Corrientes — Rosario centro",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Rosario, Santa Fe — intersección Córdoba y Corrientes",
        description: "Pantalla en la esquina comercial más importante del microcentro rosarino. Confluencia de compradores, oficinas y gastronomía. Cobertura del corredor comercial más activo de la ciudad.",
        latitude: -32.9468, longitude: -60.6393,
        basePriceAmount: d("110000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pRosario.id,
        name: "Digital Ribera — Boulevard Oroño",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Rosario, Santa Fe — costanera norte",
        description: "Pantalla frente al río Paraná en la costanera norte de Rosario. El paseo más concurrido de la ciudad los fines de semana. Audiencia joven, familias y turismo de la región.",
        latitude: -32.9277, longitude: -60.6518,
        basePriceAmount: d("88000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pRosario.id,
        name: "Valla Autopista Rosario-Buenos Aires km 0",
        format: InventoryFormat.static_ooh,
        locationLabel: "Rosario, Santa Fe — salida sur autopista",
        description: "Valla panorámica de gran formato en la salida de la autopista hacia Buenos Aires. Impacto garantizado en ejecutivos, transportistas y viajeros frecuentes del corredor más importante del país.",
        latitude: -32.9875, longitude: -60.6512,
        basePriceAmount: d("78000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pRosario.id,
        name: "Pack Rosario — 4 pantallas sur",
        format: InventoryFormat.digital_package,
        locationLabel: "Rosario Sur — barrios Fisherton y Alberdi",
        description: "Paquete de 4 pantallas en los barrios residenciales del sur de Rosario. Audiencia familiar y de clase media en zonas de alto crecimiento urbanístico. Excelente relación costo-impacto.",
        basePriceAmount: d("290000"),
        priceModel: PriceModel.package,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── CÓRDOBA PANTALLAS ── */
      {
        providerId: pCordoba.id,
        name: "Digital Nueva Córdoba — Av. Hipólito Yrigoyen",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Córdoba Capital — Nueva Córdoba",
        description: "Pantalla en el barrio universitario más importante del interior. Audiencia joven de 18-30 años con alta exposición a tendencias y consumo digital. Ideal para marcas de educación, tecnología y moda.",
        latitude: -31.4195, longitude: -64.1858,
        basePriceAmount: d("95000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pCordoba.id,
        name: "LED Centro — Peatonal Córdoba",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Córdoba Capital — microcentro peatonal",
        description: "La peatonal más transitada del interior del país. Pantalla LED de alto brillo frente a los principales locales comerciales. Contacto masivo con compradores y empleados del microcentro.",
        latitude: -31.4167, longitude: -64.1836,
        basePriceAmount: d("125000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.day,
        status: InventoryStatus.published,
      },
      {
        providerId: pCordoba.id,
        name: "Pantalla Ciudad de las Artes",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Córdoba Capital — Güemes",
        description: "Pantalla frente al polo cultural de Córdoba: Ciudad de las Artes, teatros y gastronomía del barrio Güemes. Audiencia culturalmente activa y con alto nivel educativo.",
        latitude: -31.4256, longitude: -64.1789,
        basePriceAmount: d("82000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pCordoba.id,
        name: "Valla Av. Colón — acceso aeropuerto",
        format: InventoryFormat.static_ooh,
        locationLabel: "Córdoba Capital — acceso Aeropuerto Internacional",
        description: "Valla de 54m² en el corredor principal hacia el aeropuerto de Córdoba. Audiencia ejecutiva frecuente + turismo del interior. Visibilidad clave para marcas de servicios, autos y hotelería.",
        latitude: -31.3900, longitude: -64.2089,
        basePriceAmount: d("70000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── CUYO MEDIA OUTDOOR (MENDOZA) ── */
      {
        providerId: pMendoza.id,
        name: "LED Av. San Martín — Mendoza centro",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Mendoza Capital — peatonal San Martín",
        description: "La arteria comercial más importante de Mendoza. Pantalla de última generación en la peatonal de San Martín, epicentro del comercio, gastronomía y la vida nocturna de la ciudad.",
        latitude: -32.8895, longitude: -68.8458,
        basePriceAmount: d("105000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pMendoza.id,
        name: "Pantalla Ruta del Vino — acceso Maipú",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Mendoza — Ruta Provincial 60, Maipú",
        description: "Pantalla en el ingreso al circuito turístico de bodegas de Maipú. Audiencia de turistas nacionales e internacionales que visitan los viñedos. Temporada alta octubre-marzo.",
        latitude: -32.9815, longitude: -68.7890,
        basePriceAmount: d("78000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pMendoza.id,
        name: "Valla Acceso Norte Mendoza",
        format: InventoryFormat.static_ooh,
        locationLabel: "Mendoza — Autopista Acceso Norte",
        description: "Valla de 48m² en el principal acceso a la ciudad de Mendoza desde Buenos Aires. Primer impacto para visitantes y residentes. Tránsito de +80.000 vehículos diarios.",
        latitude: -32.8542, longitude: -68.8287,
        basePriceAmount: d("65000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── MAR DEL PLATA OUTDOOR ── */
      {
        providerId: pMdp.id,
        name: "LED Peatonal San Martín — Mar del Plata",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Mar del Plata, Buenos Aires — peatonal centro",
        description: "Pantalla en la peatonal más concurrida de la ciudad balnearia más popular de Argentina. Temporada alta veraniega con +7 millones de turistas. Audiencia mixta con alto poder de compra.",
        latitude: -38.0023, longitude: -57.5575,
        basePriceAmount: d("115000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pMdp.id,
        name: "Pantalla Rambla Casino",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Mar del Plata — frente al casino central",
        description: "La ubicación más icónica de Mar del Plata: frente al casino y la rambla. Cientos de miles de turistas en temporada alta. Perfecta para entretenimiento, hotelería y marcas de consumo masivo.",
        latitude: -38.0056, longitude: -57.5421,
        basePriceAmount: d("140000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pMdp.id,
        name: "Valla Ruta 2 — ingreso Mar del Plata",
        format: InventoryFormat.static_ooh,
        locationLabel: "Mar del Plata — ingreso por Ruta 2",
        description: "Valla de bienvenida en el ingreso principal a Mar del Plata por la ruta 2. Primera impresión para millones de turistas en temporada alta. Alta rotación de audiencia enero-febrero.",
        latitude: -37.9312, longitude: -57.5684,
        basePriceAmount: d("92000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── METRÓPOLI INTERIOR ── */
      {
        providerId: pInt.id,
        name: "Digital vía Rosario — Av. Pellegrini",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Rosario, Santa Fe — acceso sur Pellegrini",
        description: "Pantalla LED en el acceso sur de Rosario sobre la avenida Pellegrini. Corredor de trabajo y comercio con alta frecuencia diaria de empleados de la industria agroexportadora.",
        latitude: -32.9442, longitude: -60.6505,
        basePriceAmount: d("88000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pInt.id,
        name: "Valla Tucumán — Ruta 9 Norte",
        format: InventoryFormat.static_ooh,
        locationLabel: "San Miguel de Tucumán — Ruta Nacional 9",
        description: "Valla de gran visibilidad en la ruta 9 acceso norte a Tucumán. Principal ciudad del NOA con alta dinámica comercial. Audiencia regional que cubre Tucumán, Salta y Jujuy.",
        latitude: -26.7731, longitude: -65.1949,
        basePriceAmount: d("52000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pInt.id,
        name: "Digital Salta — centro histórico",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Salta Capital — microcentro",
        description: "Pantalla en el pintoresco centro histórico de Salta. Ciudad de turismo cultural con alta afluencia de viajeros nacionales e internacionales. Perfecta para marcas de turismo y gastronomía regional.",
        latitude: -24.7858, longitude: -65.4117,
        basePriceAmount: d("62000"),
        priceModel: PriceModel.negotiable,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pInt.id,
        name: "Pack interior — 5 ciudades",
        format: InventoryFormat.digital_package,
        locationLabel: "Córdoba, Rosario, Mendoza, Tucumán y Salta",
        description: "Paquete nacional de cobertura interior: 5 pantallas en simultáneo en las principales ciudades del interior. Máxima cobertura regional para campañas de alcance federal con una sola contratación.",
        basePriceAmount: d("560000"),
        priceModel: PriceModel.package,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },

      /* ── NEXUS PREMIUM OOH ── */
      {
        providerId: pPremium.id,
        name: "Aeropuerto Ezeiza — sala de embarque internacional",
        format: InventoryFormat.digital_ooh,
        locationLabel: "Aeropuerto Internacional Ministro Pistarini, Ezeiza",
        description: "Pantalla en la sala de embarque internacional del principal aeropuerto de Argentina. Audiencia de viajeros frecuentes con alto poder adquisitivo. Impacto en ejecutivos, empresarios y turistas premium.",
        latitude: -34.8222, longitude: -58.5358,
        basePriceAmount: d("450000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pPremium.id,
        name: "Shopping Alto Palermo — pasillo central",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Palermo — Shopping Alto Palermo",
        description: "Pantalla de alto impacto en el pasillo central del shopping más premium de CABA. +30.000 visitantes diarios en el segmento ABC1. Máxima visibilidad para marcas de moda, tecnología y lifestyle.",
        latitude: -34.5878, longitude: -58.4267,
        basePriceAmount: d("380000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pPremium.id,
        name: "Autopista Illia — entrada a Puerto Madero",
        format: InventoryFormat.digital_ooh,
        locationLabel: "CABA, Puerto Madero — Autopista Illia",
        description: "Pantalla LED de gran formato en el ingreso a Puerto Madero desde la Autopista Illia. Audiencia ejecutiva de alta renta en el barrio más premium de Buenos Aires. Visibilidad desde 300 metros.",
        latitude: -34.6101, longitude: -58.3654,
        basePriceAmount: d("350000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pPremium.id,
        name: "Pack aeropuertos — Ezeiza + Aeroparque",
        format: InventoryFormat.digital_package,
        locationLabel: "Aeropuerto Ezeiza + Aeroparque Jorge Newbery — CABA",
        description: "Paquete exclusivo de presencia simultánea en los dos aeropuertos de Buenos Aires. Cobertura total del segmento viajero ABC1 frecuente. El medio premium por excelencia para marcas globales.",
        basePriceAmount: d("750000"),
        priceModel: PriceModel.package,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
      {
        providerId: pPremium.id,
        name: "Shopping Unicenter — food court nivel 3",
        format: InventoryFormat.digital_ooh,
        locationLabel: "GBA Norte, Martínez — Shopping Unicenter",
        description: "Pantalla digital en el food court del shopping más visitado del norte del GBA. +40.000 visitantes diarios, familias y jóvenes de clase media alta. Exposición garantizada en el momento de decisión de compra.",
        latitude: -34.4938, longitude: -58.5089,
        basePriceAmount: d("295000"),
        priceModel: PriceModel.fixed_list,
        minimalBookingGranularity: BookingGranularity.week,
        status: InventoryStatus.published,
      },
    ],
  });

  /* ── RESERVAS DEMO ──────────────────────────────────────────────────────── */

  const findUnit = (substr: string) => units.find((u) => u.name.includes(substr))!;

  const t0 = new Date("2026-05-01T00:00:00.000Z");
  const t1 = new Date("2026-05-14T23:59:59.999Z");
  const t2 = new Date("2026-05-20T00:00:00.000Z");
  const t3 = new Date("2026-06-03T23:59:59.999Z");
  const t4 = new Date("2026-06-15T00:00:00.000Z");
  const t5 = new Date("2026-06-28T23:59:59.999Z");
  const t6 = new Date("2026-07-01T00:00:00.000Z");
  const t7 = new Date("2026-07-31T23:59:59.999Z");

  const uObelisco  = findUnit("Obelisco — paseo");
  const uFlorida   = findUnit("Florida");
  const uSubteB    = findUnit("Línea B");
  const uRosario   = findUnit("Pellegrini");
  const uEzeiza    = findUnit("Ezeiza — sala");
  const uAltoP     = findUnit("Alto Palermo");
  const uPalSoho   = findUnit("Honduras");
  const uCorPeat   = findUnit("Peatonal Córdoba");
  const uPanamer   = findUnit("Panamericana");
  const uMdpCasino = findUnit("Rambla Casino");

  await prisma.reservation.createMany({
    data: [
      /* Marca Demo — múltiples campañas */
      {
        inventoryUnitId: uObelisco.id,
        advertiserId: adv1.id,
        startsAt: t2, endsAt: t3,
        status: ReservationStatus.pending_provider,
        agreedAmount: uObelisco.basePriceAmount,
      },
      {
        inventoryUnitId: uEzeiza.id,
        advertiserId: adv1.id,
        startsAt: t4, endsAt: t5,
        status: ReservationStatus.accepted,
        agreedAmount: uEzeiza.basePriceAmount,
      },
      {
        inventoryUnitId: uAltoP.id,
        advertiserId: adv1.id,
        startsAt: t6, endsAt: t7,
        status: ReservationStatus.pending_provider,
        agreedAmount: uAltoP.basePriceAmount,
      },
      {
        inventoryUnitId: uSubteB.id,
        advertiserId: adv1.id,
        startsAt: t0, endsAt: t1,
        status: ReservationStatus.confirmed,
        agreedAmount: uSubteB.basePriceAmount,
        platformFeeRate: d("0.065"),
      },

      /* Pyme Local — campañas locales */
      {
        inventoryUnitId: uFlorida.id,
        advertiserId: adv2.id,
        startsAt: t0, endsAt: t1,
        status: ReservationStatus.accepted,
        agreedAmount: uFlorida.basePriceAmount,
      },
      {
        inventoryUnitId: uRosario.id,
        advertiserId: adv2.id,
        startsAt: t2, endsAt: t3,
        status: ReservationStatus.rejected,
        agreedAmount: uRosario.basePriceAmount,
        providerNote: "Las fechas están bloqueadas para mantenimiento. Podemos ofrecerte la semana siguiente.",
      },
      {
        inventoryUnitId: uCorPeat.id,
        advertiserId: adv2.id,
        startsAt: t4, endsAt: t5,
        status: ReservationStatus.pending_provider,
        agreedAmount: uCorPeat.basePriceAmount,
      },

      /* Agencia 360 — campaña nacional */
      {
        inventoryUnitId: uPanamer.id,
        advertiserId: adv3.id,
        startsAt: t2, endsAt: t3,
        status: ReservationStatus.confirmed,
        agreedAmount: uPanamer.basePriceAmount,
        platformFeeRate: d("0.065"),
      },
      {
        inventoryUnitId: uPalSoho.id,
        advertiserId: adv3.id,
        startsAt: t4, endsAt: t5,
        status: ReservationStatus.accepted,
        agreedAmount: uPalSoho.basePriceAmount,
      },
      {
        inventoryUnitId: uMdpCasino.id,
        advertiserId: adv3.id,
        startsAt: t6, endsAt: t7,
        status: ReservationStatus.pending_provider,
        agreedAmount: uMdpCasino.basePriceAmount,
      },
      {
        inventoryUnitId: uObelisco.id,
        advertiserId: adv3.id,
        startsAt: t6, endsAt: t7,
        status: ReservationStatus.pending_provider,
        agreedAmount: uObelisco.basePriceAmount,
      },
    ],
  });

  const publishedCount = units.filter((u) => u.status === "published").length;

  console.log("\n✅ Seed completo — Direct Planning / Nextmedia Demo\n");
  console.log("PROVEEDORES (10):");
  console.log("  demo.medio.caba@ejemplo.ar       → Wall Street Digital");
  console.log("  demo.medio.subte@ejemplo.ar      → Vía Subte Media");
  console.log("  demo.medio.palermo@ejemplo.ar    → Palermo Digital");
  console.log("  demo.medio.gba@ejemplo.ar        → GBA Outdoor");
  console.log("  demo.medio.rosario@ejemplo.ar    → Rosario Vía Pública");
  console.log("  demo.medio.cordoba@ejemplo.ar    → Córdoba Pantallas");
  console.log("  demo.medio.mendoza@ejemplo.ar    → Cuyo Media Outdoor");
  console.log("  demo.medio.mdp@ejemplo.ar        → Mar del Plata Outdoor");
  console.log("  demo.medio.interior@ejemplo.ar   → Metrópoli Interior");
  console.log("  demo.medio.premium@ejemplo.ar    → Nexus Premium OOH");
  console.log("\nANUNCIANTES (3):");
  console.log("  demo.anunciante@ejemplo.ar       → Marca Demo S.A.");
  console.log("  demo.pyme@ejemplo.ar             → Pyme Local SRL");
  console.log("  demo.agencia@ejemplo.ar          → Agencia 360 Publicidad");
  console.log("\nADMIN:");
  console.log("  demo.admin@ejemplo.ar");
  console.log(`\n  Contraseña (todos): ${DEMO_PASSWORD}`);
  console.log(`\n  Unidades totales: ${units.length} (${publishedCount} publicadas)`);
  console.log(`  Reservas: 11 en distintos estados`);
  console.log("  Ciudades: CABA, GBA Norte/Sur/Oeste, Rosario, Córdoba, Mendoza, Mar del Plata, Tucumán, Salta\n");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

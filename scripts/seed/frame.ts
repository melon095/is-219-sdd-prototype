import type {
  ActivityEntry,
  Business,
  Person,
  Skill,
} from "../../src/domain/frame/types";
import type { Rng } from "./random";

export type FrameSeed = {
  people: Person[];
  businesses: Business[];
  skills: Skill[];
};

export type SeedModule = (
  rng: Rng,
  frame: FrameSeed,
) => { key: string; data: unknown; activity: ActivityEntry[] };

const skills: Skill[] = [
  { id: "ferdighet-1", name: "Produktfotografering" },
  { id: "ferdighet-2", name: "Shopify-oppsett" },
  { id: "ferdighet-3", name: "Søkemotoroptimalisering" },
  { id: "ferdighet-4", name: "Regnskap" },
  { id: "ferdighet-5", name: "Innholdsproduksjon" },
  { id: "ferdighet-6", name: "Sosiale medier" },
  { id: "ferdighet-7", name: "Nettbutikkdesign" },
  { id: "ferdighet-8", name: "Kundeservice" },
  { id: "ferdighet-9", name: "Pakking og forsendelse" },
  { id: "ferdighet-10", name: "Tekstskriving" },
  { id: "ferdighet-11", name: "Videoredigering" },
  { id: "ferdighet-12", name: "E-postmarkedsføring" },
  { id: "ferdighet-13", name: "Grafisk design" },
  { id: "ferdighet-14", name: "Oversettelse til engelsk" },
  { id: "ferdighet-15", name: "Lagerstyring" },
  { id: "ferdighet-16", name: "Annonsering på nett" },
  { id: "ferdighet-17", name: "Dataregistrering" },
  { id: "ferdighet-18", name: "Nettsideoppdatering" },
];

const people: Person[] = [
  {
    id: "person-1",
    name: "Kari Nordmann",
    isVaroddAdmin: false,
    seeksWork: false,
    description: "Eier av Fjordlys Keramikk",
  },
  {
    id: "person-2",
    name: "Jonas Berg",
    isVaroddAdmin: false,
    seeksWork: false,
    description: "Jobber hos Fjordlys Keramikk",
  },
  {
    id: "person-3",
    name: "Per Hansen",
    isVaroddAdmin: false,
    seeksWork: false,
    description: "Eier av Sørlandet Honning",
  },
  {
    id: "person-4",
    name: "Anne Lie",
    isVaroddAdmin: false,
    seeksWork: false,
    description: "Eier av Lindesnes Ullvarer",
  },
  {
    id: "person-5",
    name: "Ola Dahl",
    isVaroddAdmin: false,
    seeksWork: false,
    description: "Eier av Kvadraturen Kaffebrenneri",
  },
  {
    id: "person-6",
    name: "Silje Moen",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen annonsering og video",
  },
  {
    id: "person-7",
    name: "Ingrid Solberg",
    isVaroddAdmin: false,
    seeksWork: false,
    description: "Eier av Skagerrak Sjøutstyr",
  },
  {
    id: "person-8",
    name: "Mats Johansen",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen nettbutikk og markedsføring",
  },
  {
    id: "person-9",
    name: "Amina Yusuf",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen foto og innhold",
  },
  {
    id: "person-10",
    name: "Henrik Larsen",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen regnskap og administrasjon",
  },
  {
    id: "person-11",
    name: "Lena Eriksen",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen design og sosiale medier",
  },
  {
    id: "person-12",
    name: "Omar Ali",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen lager og kundeservice",
  },
  {
    id: "person-13",
    name: "Thea Bakke",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker oppdrag innen tekst og oversettelse",
  },
  {
    id: "person-14",
    name: "Sander Haugen",
    isVaroddAdmin: false,
    seeksWork: true,
    description: "Søker sitt første oppdrag",
  },
  {
    id: "person-15",
    name: "Marte Vik",
    isVaroddAdmin: true,
    seeksWork: false,
    description: "Rådgiver hos Varodd",
  },
];

const businesses: Business[] = [
  {
    id: "bedrift-1",
    name: "Fjordlys Keramikk",
    description:
      "Håndlaget keramikk fra verkstedet i Kristiansand, solgt i en liten Shopify-butikk.",
    ownerId: "person-1",
    employeeIds: ["person-2"],
    isEWavesMember: true,
    crawlOptIn: true,
    crawlSuggestions: [],
  },
  {
    id: "bedrift-2",
    name: "Sørlandet Honning",
    description:
      "Honning og bivoksprodukter fra egne bikuber, solgt på nett og på markeder.",
    ownerId: "person-3",
    employeeIds: [],
    isEWavesMember: true,
    crawlOptIn: false,
    crawlSuggestions: [],
  },
  {
    id: "bedrift-3",
    name: "Lindesnes Ullvarer",
    description:
      "Strikkeplagg og garn fra en nettbutikk som drives av én person.",
    ownerId: "person-4",
    employeeIds: [],
    isEWavesMember: false,
    crawlOptIn: true,
    crawlSuggestions: [],
  },
  {
    id: "bedrift-4",
    name: "Kvadraturen Kaffebrenneri",
    description:
      "Lite kaffebrenneri med nettbutikk og kaffeabonnement til hele landet.",
    ownerId: "person-5",
    employeeIds: [],
    isEWavesMember: true,
    crawlOptIn: true,
    crawlSuggestions: [],
  },
  {
    id: "bedrift-5",
    name: "Skagerrak Sjøutstyr",
    description:
      "Nettbutikk for fiskeutstyr og båttilbehør, drevet fra Mandal.",
    ownerId: "person-7",
    employeeIds: [],
    isEWavesMember: false,
    crawlOptIn: false,
    crawlSuggestions: [],
  },
];

export function buildFrameSeed(_rng: Rng): FrameSeed {
  return {
    people: people.map((person) => ({ ...person })),
    businesses: businesses.map((business) => ({
      ...business,
      employeeIds: [...business.employeeIds],
      crawlSuggestions: [...business.crawlSuggestions],
    })),
    skills: skills.map((skill) => ({ ...skill })),
  };
}

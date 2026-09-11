import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { offers, offerPositions, projects, orgs } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { OfferDocument } from '@/components/pdf/offer-document';
import type { ReportLetterhead } from './assemble-standard-report';

/**
 * Angebots-PDF (Slice E1) — the CLIENT document.
 *
 * The loader deliberately selects NO internal data: no estimated hours, no
 * external costs, no org calibration, no margin. `OfferPdfData` cannot carry
 * what it never loads — margin leakage into a client document is impossible
 * by construction.
 */

export type OfferPdfData = {
  offer: {
    id: string;
    title: string;
    /** numeric column — Drizzle returns it as a string */
    festpreisEur: string;
    validUntil: string | null;
    bearbeitungszeit: string | null;
  };
  /** Client-safe: Position + Beschreibung only. */
  positions: Array<{ position: string; note: string | null }>;
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    clientName: string | null;
    location: string | null;
  };
  letterhead: ReportLetterhead | null;
  generatedAt: string;
};

export async function loadOfferData(
  projectId: string,
  offerId: string,
): Promise<OfferPdfData> {
  const [offer] = await db
    .select({
      id: offers.id,
      title: offers.title,
      festpreisEur: offers.festpreisEur,
      validUntil: offers.validUntil,
      bearbeitungszeit: offers.bearbeitungszeit,
    })
    .from(offers)
    .where(and(eq(offers.id, offerId), eq(offers.projectId, projectId)))
    .limit(1);
  if (!offer) throw new Error(`Offer ${offerId} not found`);

  const positions = await db
    .select({
      position: offerPositions.position,
      note: offerPositions.note,
    })
    .from(offerPositions)
    .where(eq(offerPositions.offerId, offerId))
    .orderBy(asc(offerPositions.orderIndex));

  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectCode: projects.projectCode,
      clientName: projects.clientName,
      location: projects.location,
      org: {
        id: orgs.id,
        name: orgs.name,
        logoUrl: orgs.logoUrl,
        addressLine1: orgs.addressLine1,
        addressLine2: orgs.addressLine2,
        postalCode: orgs.postalCode,
        city: orgs.city,
        phone: orgs.phone,
        email: orgs.email,
        website: orgs.website,
      },
    })
    .from(projects)
    .leftJoin(orgs, eq(orgs.id, projects.orgId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error(`Project ${projectId} not found`);

  return {
    offer,
    positions,
    project: {
      id: proj.id,
      name: proj.name,
      projectCode: proj.projectCode,
      clientName: proj.clientName,
      location: proj.location,
    },
    letterhead: proj.org && proj.org.id
      ? {
        orgName: proj.org.name ?? '',
        logoUrl: proj.org.logoUrl,
        addressLine1: proj.org.addressLine1,
        addressLine2: proj.org.addressLine2,
        postalCode: proj.org.postalCode,
        city: proj.org.city,
        phone: proj.org.phone,
        email: proj.org.email,
        website: proj.org.website,
      }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildOfferPdf(data: OfferPdfData): Promise<Buffer> {
  return renderToBuffer(<OfferDocument data={data} />);
}

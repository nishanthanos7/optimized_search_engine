import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITIZEN_SERVICES, getCitizenService } from "@/lib/citizen/services";
import { ServicePageView } from "@/components/citizen/service-page-view";

export function generateStaticParams() {
  return CITIZEN_SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params;
  const service = getCitizenService(slug);
  if (!service) return {};
  return {
    title: `${service.name} — Index Nepal`,
    description: service.description,
  };
}

export default async function ServicePage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const service = getCitizenService(slug);
  if (!service) notFound();
  return <ServicePageView service={service} />;
}

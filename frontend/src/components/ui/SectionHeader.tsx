import Link from 'next/link';

export default function SectionHeader({
  title,
  viewAllLink,
  viewAllText = 'Ver todo',
}: {
  title: string;
  viewAllLink?: string;
  viewAllText?: string;
}) {
  return (
    <div className="px-margin-mobile flex justify-between items-end mb-4">
      <h3 className="text-headline-md font-headline-md">{title}</h3>
      {viewAllLink && (
        <Link href={viewAllLink} className="text-secondary text-label-md font-label-md">
          {viewAllText}
        </Link>
      )}
    </div>
  );
}

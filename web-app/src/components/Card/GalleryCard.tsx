export interface GalleryCardProps {
  name: string;
  src: string;
  desc:string;
}

const GalleryCard: React.FC<GalleryCardProps> = (props: GalleryCardProps) => {
  const { name, src, desc } = props;
  return (
    <div className="w-full h-full flex flex-col border p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <img className="w-full h-5/6" alt={name} src={src} />
      <div className="flex justify-center items-center px-4 py-2 text-lg leading-tight">
        <span>{name}</span>
        <span>{desc}</span>
      </div>
    </div>
  );
};

export default GalleryCard;

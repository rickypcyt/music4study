import { Button } from 'shadcn/ui';

export const CustomButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
  return (
    <Button
      className="bg-study-purple hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
      onClick={onClick}
    >
      {children}
    </Button>
  );
};
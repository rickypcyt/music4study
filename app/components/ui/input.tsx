import { Input } from '@shadcn/ui';

export const CustomInput = ({ placeholder }: { placeholder: string }) => {
  return (
    <Input
      className="border-2 border-study-purple rounded-lg p-2"
      placeholder={placeholder}
    />
  );
};
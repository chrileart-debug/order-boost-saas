import { Input } from "@/components/ui/input";
import { maskPhone, maskCep } from "@/lib/masks";
import { ComponentProps } from "react";

type MaskType = "phone" | "cep";

interface MaskedInputProps extends Omit<ComponentProps<typeof Input>, "onChange"> {
  mask: MaskType;
  value: string;
  onValueChange: (masked: string) => void;
}

const maskFns: Record<MaskType, (v: string) => string> = {
  phone: maskPhone,
  cep: maskCep,
};

const MaskedInput = ({ mask, value, onValueChange, ...props }: MaskedInputProps) => {
  return (
    <Input
      value={value}
      onChange={(e) => onValueChange(maskFns[mask](e.target.value))}
      {...props}
    />
  );
};

export default MaskedInput;

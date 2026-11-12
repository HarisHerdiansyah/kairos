import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { signOut } from "next-auth/react";

type NavbarPopoverProps = {
  trigger: React.ReactElement;
};

export function NavbarPopover({ trigger }: NavbarPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-56" align="end">
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Dashboard
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Sign Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

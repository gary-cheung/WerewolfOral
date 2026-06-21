import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameRole, roleInfoMap } from "@shared/schema";
import { useState } from "react";
import werewolfAvatar from "@assets/generated_images/Werewolf_role_avatar_44bf4427.png";
import prophetAvatar from "@assets/generated_images/Prophet_role_avatar_b2af432c.png";
import villagerAvatar from "@assets/generated_images/Villager_role_avatar_d595686f.png";
import witchAvatar from "@assets/generated_images/Witch_role_avatar_25883d2b.png";
import hunterAvatar from "@assets/generated_images/Hunter_role_avatar_7a11a3e1.png";

interface RoleSelectionDialogProps {
  open: boolean;
  onSelect: (role: GameRole) => void;
}

const roleAvatars: Partial<Record<GameRole, string>> = {
  werewolf: werewolfAvatar,
  prophet: prophetAvatar,
  villager: villagerAvatar,
  witch: witchAvatar,
  hunter: hunterAvatar,
};

export default function RoleSelectionDialog({ open, onSelect }: RoleSelectionDialogProps) {
  const [selectedRole, setSelectedRole] = useState<GameRole | null>(null);

  const roles: GameRole[] = ["villager", "werewolf", "prophet", "witch", "hunter"];

  const handleConfirm = () => {
    if (selectedRole) {
      onSelect(selectedRole);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Select Your Role</DialogTitle>
          <DialogDescription>
            Choose a character to practice different English speaking patterns
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 py-4">
          {roles.map((role) => {
            const info = roleInfoMap[role];
            const isSelected = selectedRole === role;

            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover-elevate ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                data-testid={`button-role-${role}`}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
                  <img 
                    src={roleAvatars[role]} 
                    alt={info.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{info.nameCn}</p>
                  <p className="text-[10px] text-muted-foreground">{info.descriptionCn}</p>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={!selectedRole}
            className="w-full sm:w-auto"
            data-testid="button-confirm-role"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

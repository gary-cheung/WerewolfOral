import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Player } from "@shared/schema";

interface GameResultDialogProps {
  open: boolean;
  winner: "villagers" | "werewolves";
  players: Player[];
  onViewReport: () => void;
}

export default function GameResultDialog({ open, winner, players, onViewReport }: GameResultDialogProps) {
  const isVillagersWin = winner === "villagers";

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            <span className={isVillagersWin ? "text-primary" : "text-destructive"}>
              {isVillagersWin ? "Villagers Win!" : "Werewolves Win!"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className={`py-4 px-6 rounded-lg ${isVillagersWin ? 'bg-primary/10' : 'bg-destructive/10'}`}>
          <p className="text-center text-sm text-muted-foreground">
            {isVillagersWin 
              ? "All werewolves have been eliminated!" 
              : "Werewolves have taken control of the village!"}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Role Reveal</h3>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-2 gap-3 pr-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  data-testid={`player-result-${player.id}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={player.role === "werewolf" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {player.role || "unknown"}
                      </Badge>
                      {player.status === "dead" && (
                        <Badge variant="outline" className="text-xs">Eliminated</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button 
            onClick={onViewReport} 
            className="w-full" 
            size="lg"
            data-testid="button-view-report"
          >
            View Learning Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const reportReasons = [
  { id: 'inappropriate', label: 'Inappropriate Content' },
  { id: 'copyright', label: 'Copyright Infringement' },
  { id: 'explicit', label: 'Explicit Content' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'other', label: 'Other' },
];

interface ReportDialogProps {
  contentId: number;
  contentTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportDialog({ contentId, contentTitle, isOpen, onClose }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = React.useState('');
  const [description, setDescription] = React.useState('');
  const { toast } = useToast();

  const reportMutation = useMutation({
    mutationFn: async (data: { videoId: number; reason: string; details: string }) => {
      const res = await apiRequest('POST', '/api/report', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our platform safe.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      toast({
        title: "Error",
        description: "Please select a reason for reporting.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate({
      videoId: contentId,
      reason: selectedReason,
      details: description,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Report Content</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-slate-300 mb-4 italic">
              Reporting: <span className="font-semibold text-orange-500">{contentTitle}</span>
            </p>

            <Label className="text-white">Reason for reporting</Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="mt-2 space-y-2"
            >
              {reportReasons.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <Label htmlFor={reason.id} className="text-white">{reason.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="report-details" className="text-white">Additional details (optional)</Label>
            <Textarea
              id="report-details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide any additional information that will help us understand the issue..."
              className="mt-1 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-slate-700 text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

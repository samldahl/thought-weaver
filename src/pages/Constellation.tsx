import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ThoughtConstellation } from '@/components/ThoughtConstellation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Thought {
  id: string;
  text: string;
  color: string;
  documentName: string;
  documentId: string;
  documentDate: string;
  x: number;
  y: number;
  size: number;
}

export function ConstellationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultDate = (location.state as any)?.defaultDate;
  
  // If navigated from canvas with a specific date, use 'today' filter
  // Otherwise default to 'all'
  const [dateFilter, setDateFilter] = useState<string>(defaultDate ? 'today' : 'all');
  
  const { data: allThoughts, isLoading, error } = useQuery<Thought[]>({
    queryKey: ['all-thoughts'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5001/api/documents/thoughts/all', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch thoughts');
      return res.json();
    }
  });

  // Filter thoughts by date range
  const filteredThoughts = useMemo(() => {
    if (!allThoughts) return [];

    // Use the date from navigation state if available, otherwise use actual today
    const referenceDate = defaultDate ? new Date(defaultDate) : new Date();
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    
    let cutoffDate: Date;
    
    switch (dateFilter) {
      case 'today':
        cutoffDate = today;
        break;
      case '3days':
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 3);
        break;
      case '7days':
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '30days':
        cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
      case 'all':
        return allThoughts;
      default:
        cutoffDate = today;
    }
    
    return allThoughts.filter(thought => {
      const thoughtDate = new Date(thought.documentDate);
      return thoughtDate >= cutoffDate;
    });
  }, [allThoughts, dateFilter, defaultDate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading constellation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">Failed to load thoughts</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-6 bg-background">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Canvas
          </Button>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="3days">Last 3 Days</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredThoughts.length} thought{filteredThoughts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <ThoughtConstellation thoughts={filteredThoughts} />
      </div>
    </div>
  );
}

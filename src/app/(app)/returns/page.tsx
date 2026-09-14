'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Undo,
  Replace,
  Calendar,
  FileText,
  Banknote,
  HelpCircle,
  Download,
  ShieldCheck,
  Clock,
  BadgeCheck,
  Sparkles,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, { useState } from 'react';
import { useApp, ReturnEntry } from '@/context/app-context';

const getStatusConfig = (status: string): { variant: 'outline' | 'secondary'; icon: React.ElementType } => {
  switch (status.toLowerCase()) {
    case 'replaced':
    case 'approved':
      return { variant: 'secondary', icon: Replace };
    case 'returned':
    case 'pending':
    default:
      return { variant: 'outline', icon: Undo };
  }
};

export default function ReturnsPage() {
  const { returns } = useApp();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnEntry | null>(null);

  const replacedCount = returns?.filter((r) => r.status.toLowerCase() === 'replaced' || r.status.toLowerCase() === 'approved').length || 0;
  const returnedCount = returns?.filter((r) => r.status.toLowerCase() === 'returned' || r.status.toLowerCase() === 'pending').length || 0;

  const KPI_CARDS = [
    { icon: Undo, label: 'Open Returns', value: returnedCount.toString(), unit: 'in review' },
    { icon: Replace, label: 'Approved / Replaced', value: replacedCount.toString(), unit: 'processed' },
    { icon: Banknote, label: 'Total Requests', value: (returns?.length || 0).toString(), unit: 'records' },
    { icon: Clock, label: 'Avg SLA', value: '5-7', unit: 'days' },
  ];

  const handleOpenDetails = (item: ReturnEntry) => {
    setSelectedReturn(item);
    setIsDetailOpen(true);
  };

  const handleDownloadReturnInvoice = (item: ReturnEntry) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PerfectFit', 14, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Navi Mumbai, Maharashtra, India', 14, 30);
    doc.text('support@perfectfit.com', 14, 35);
    doc.text('+91 9867408609', 14, 40);

    doc.setFontSize(18);
    doc.text('Credit Note / Return Request', pageWidth - 14, 22, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Return ID: ${item.id.slice(0, 8)}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Date: ${new Date(item.created_at).toLocaleDateString()}`, pageWidth - 14, 35, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(14, 50, pageWidth - 14, 50);

    // --- Return Details ---
    (doc as any).autoTable({
      startY: 65,
      head: [['Order ID', 'Reason', 'Status', 'Date']],
      body: [[item.order_id.slice(0, 8), item.reason, item.status, new Date(item.created_at).toLocaleDateString()]],
      theme: 'striped',
      headStyles: { fillColor: [143, 88, 240] },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.line(14, pageHeight - 30, pageWidth - 14, pageHeight - 30);
    doc.setFontSize(10);
    doc.text('Thank you for trusting PerfectFit!', pageWidth / 2, pageHeight - 22, { align: 'center' });
    doc.text('Need help? Contact us at support@perfectfit.com', pageWidth / 2, pageHeight - 15, { align: 'center' });

    doc.save(`PerfectFit-Return-${item.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fade-in-up p-4 sm:p-6 md:p-10 bg-gradient-to-b from-background via-background/70 to-background/40">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl border border-muted/40 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 sm:p-10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs rounded-full border border-primary/30 bg-primary/5 text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Protected Returns
            </span>
            <span className="px-3 py-1 text-xs rounded-full border border-primary/30 bg-primary/5 text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Database Backed
            </span>
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500">Returns & Refunds Hub</h1>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Manage returns, replacements, and refund requests with enterprise-grade transparency and clarity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-muted-foreground">⏱ Refunds in 5–7 days</span>
            <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-muted-foreground">📑 Downloadable credit notes</span>
            <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-muted-foreground">🤝 Replacement-first policy</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="shadow-lg border-muted/40 bg-background/70 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.unit}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* --- Return Policy Section --- */}
      <Card className="shadow-xl border border-border/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 animate-text-rainbow">
            Return & Refund Policy
          </CardTitle>
          <CardDescription>
            Everything you need to know about returning or replacing your garments.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                title: '30-Day Return Policy (Purchased Items)',
                content:
                  'We want you to be completely satisfied with your purchase. If you’re not, return it within 30 days in its original condition for a full refund or exchange.',
              },
              {
                title: 'Rental Returns',
                content:
                  'Rental items must be returned by the due date using the prepaid label provided. Late returns may incur daily fees or full retail charge after 14 days.',
              },
              {
                title: 'Damaged or Incorrect Items',
                content:
                  'If you receive a damaged or incorrect item, contact support within 48 hours with a photo. We’ll arrange a replacement or full refund.',
              },
              {
                title: 'Refund Process',
                content:
                  'Once inspected, refunds are processed within 5–7 business days to your original payment method.',
              },
              {
                title: 'Non-Returnable Items',
                content:
                  'Custom-made garments are non-returnable but include one free alteration for fit issues.',
              },
            ].map((policy, i) => (
              <AccordionItem key={i} value={`policy-${i}`}>
                <AccordionTrigger>{policy.title}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{policy.content}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* --- Return History Section --- */}
      <Card className="shadow-xl border border-border/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 animate-text-rainbow">
            Return History
          </CardTitle>
          <CardDescription>Track your past returns, replacements, and refund details.</CardDescription>
        </CardHeader>

        <CardContent>
          {returns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No return requests found.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((item) => {
                    const statusConfig = getStatusConfig(item.status);
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/50 cursor-pointer transition"
                        onClick={() => handleOpenDetails(item)}
                      >
                        <TableCell className="font-semibold">{item.id.slice(0, 8)}</TableCell>
                        <TableCell>{item.order_id.slice(0, 8)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1.5 capitalize">
                            <statusConfig.icon className="h-3.5 w-3.5" />
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Dialog for Details --- */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Details: {selectedReturn?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              Review details for your return request.
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4 py-3">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <PackageCheck className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Order #{selectedReturn.order_id.slice(0, 8)}</h3>
                  <p className="text-sm text-muted-foreground capitalize">Status: {selectedReturn.status}</p>
                  <p className="text-sm text-muted-foreground">Date: {new Date(selectedReturn.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              {/* Reason */}
              <Card className="bg-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <HelpCircle className="h-4 w-4" /> Reason for Return
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium text-sm text-foreground">
                    {selectedReturn.reason}
                  </p>
                  {selectedReturn.description && (
                    <p className="text-xs text-muted-foreground">
                      {selectedReturn.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReturnInvoice(selectedReturn)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Credit Note
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

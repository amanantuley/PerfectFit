'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet as WalletIcon,
  Coins,
  ShieldCheck,
  LineChart,
  Plus,
  CreditCard,
  Banknote,
  FileDown,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { platformApi, ApiWallet, ApiTransaction } from '@/lib/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function WalletPage() {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMoney, setAddingMoney] = useState(false);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.all([
        platformApi.getWallet(),
        platformApi.getWalletTransactions(),
      ]);
      setWallet(walletRes);
      setTransactions(txRes || []);
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const addFunds = async (amt: number) => {
    setAddingMoney(true);
    try {
      const updated = await platformApi.addWalletMoney(amt);
      setWallet(updated);
      toast({ title: 'Funds Added', description: `₹${amt.toLocaleString('en-IN')} added to your wallet.` });
      const txRes = await platformApi.getWalletTransactions();
      setTransactions(txRes || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Top-up Failed', description: err.message || 'Could not add funds.' });
    } finally {
      setAddingMoney(false);
    }
  };

  const exportStatement = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PerfectPay Wallet Statement', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    (doc as any).autoTable({
      startY: 34,
      head: [['ID', 'Date', 'Type', 'Description', 'Amount']],
      body: transactions.map((t) => [
        t.id.slice(0, 8),
        new Date(t.created_at).toLocaleDateString(),
        t.transaction_type.toUpperCase(),
        t.description || 'N/A',
        `₹${t.amount.toLocaleString('en-IN')}`
      ]),
      headStyles: { fillColor: [143, 88, 240] },
    });
    doc.save('PerfectPay-Statement.pdf');
  };

  const balance = wallet ? wallet.balance : 0;

  return (
    <motion.div
      className="space-y-8 animate-fade-in-up"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Hero */}
      <Card className="shadow-2xl border border-muted/40 bg-background/60 backdrop-blur-md">
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="text-left">
              <div className="flex items-center gap-3">
                <motion.div className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 p-[3px] rounded-full" initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}>
                  <div className="bg-background rounded-full p-3">
                    <WalletIcon className="h-8 w-8 text-primary drop-shadow-md" />
                  </div>
                </motion.div>
                <CardTitle className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 animate-text-rainbow">
                  PerfectPay Wallet
                </CardTitle>
              </div>
              <CardDescription>Your intelligent, secure, and rewarding way to pay.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30 text-primary"><ShieldCheck className="h-4 w-4" /> Database Backed</Badge>
              <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30 text-primary"><LineChart className="h-4 w-4" /> Verified Wallet</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Balance', value: `₹${balance.toLocaleString('en-IN')}`, icon: Coins },
              { label: 'Currency', value: wallet?.currency || 'INR', icon: Banknote },
              { label: 'Status', value: wallet?.is_active ? 'Active' : 'Pending', icon: ShieldCheck },
              { label: 'Security', value: 'JWT Encrypted', icon: ShieldCheck }
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-muted/30 bg-background/70 px-4 py-3 shadow-sm">
                <span className="p-2 rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span>
                <div className="leading-tight">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          {/* Balance card */}
          <Card className="lg:col-span-2 border border-muted/30 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-sky-500/10">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Wallet balance</p>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <motion.h3 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500" animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  ₹{balance.toLocaleString('en-IN')}
                </motion.h3>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={() => addFunds(1000)} disabled={addingMoney} className="gap-2 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 text-white">
                  {addingMoney ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add ₹1,000
                </Button>
                <Button onClick={() => addFunds(500)} disabled={addingMoney} variant="outline" className="gap-2">
                  {addingMoney ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add ₹500
                </Button>
                <Button onClick={exportStatement} variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" /> Export statement
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment methods */}
          <Card className="border border-muted/30">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Payment Methods</p>
                <Badge variant="outline" className="bg-primary/5 border-primary/30">Razorpay Enabled</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>UPI / Cards</span><Badge variant="outline" className="bg-primary/5 border-primary/30">Default</Badge></div>
                <div className="flex items-center justify-between"><span>Wallet Balance</span><span className="text-muted-foreground">Instant Checkout</span></div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="border border-muted/30 shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Recent Transactions</CardTitle>
            <CardDescription>Real-time history of wallet credits and debits.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportStatement} className="gap-1"><FileDown className="h-4 w-4" /> Export</Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transactions recorded yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.id.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{t.transaction_type}</TableCell>
                      <TableCell>{t.description || 'Wallet Update'}</TableCell>
                      <TableCell className="text-right">
                        <span className={t.transaction_type === 'credit' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                          {t.transaction_type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

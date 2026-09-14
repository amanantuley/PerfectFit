'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/context/translation-provider';
import { useToast } from '@/hooks/use-toast';
import { platformApi, ApiMessage } from '@/lib/api';
import { useAuthContext } from '@/context/auth-provider';

export default function TailorMessagesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthContext();

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [activeReceiverId, setActiveReceiverId] = useState<string | null>(null);
  const [mobileActive, setMobileActive] = useState(false);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await platformApi.listMessages();
      setMessages(data || []);
      if (data && data.length > 0) {
        const otherId = data[0].sender_id === user?.id ? data[0].receiver_id : data[0].sender_id;
        setActiveReceiverId(otherId);
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [user]);

  const activeMessages = messages.filter(
    (m) =>
      (m.sender_id === activeReceiverId || m.receiver_id === activeReceiverId)
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeReceiverId) return;

    setSending(true);
    try {
      const sent = await platformApi.sendMessage({
        receiver_id: activeReceiverId,
        content: messageInput.trim(),
      });
      setMessages((prev) => [...prev, sent]);
      setMessageInput('');
      toast({
        title: 'Message Sent',
        description: 'Your message has been delivered.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to send message.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex animate-fade-in-up gap-6">
      {/* Conversation List */}
      <Card
        className={cn(
          'w-full md:w-1/3 md:flex flex-col shadow-lg border-muted/40 bg-background/70 backdrop-blur-sm',
          mobileActive && 'hidden md:flex'
        )}
      >
        <CardHeader className="border-b">
          <CardTitle className="text-xl">{t('Atelier Messages')}</CardTitle>
          <CardDescription>Direct client communication</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No active conversations found.
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div
                className={cn(
                  'flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 border-b bg-muted/30',
                  activeReceiverId && 'bg-muted'
                )}
                onClick={() => setMobileActive(true)}
              >
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src="/placeholder.png" />
                  <AvatarFallback>C</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <p className="font-semibold truncate">Active Client</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {messages[messages.length - 1]?.content || 'Start chat'}
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Conversation View */}
      <Card
        className={cn('flex-1 flex-col shadow-lg border-muted/40 bg-background/70 backdrop-blur-sm', mobileActive ? 'flex' : 'hidden md:flex')}
      >
        {activeReceiverId ? (
          <>
            <CardHeader className="border-b flex-row items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileActive(false)}
              >
                <ArrowLeft />
              </Button>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 animate-text-rainbow">
                  Client Communication
                </CardTitle>
                <CardDescription>
                  Customer ID: {activeReceiverId.slice(0, 8)}
                </CardDescription>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {activeMessages.map((message) => {
                    const isTailor = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex items-start gap-4',
                          isTailor ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {!isTailor && (
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src="/placeholder.png" alt="Client" />
                            <AvatarFallback>C</AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            'max-w-md space-y-2',
                            isTailor && 'text-right'
                          )}
                        >
                          <p className="font-bold text-sm">
                            {isTailor ? t('You') : 'Client'}
                          </p>
                          <div
                            className={cn(
                              'rounded-lg px-4 py-3 text-sm',
                              isTailor
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-muted rounded-bl-none'
                            )}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                        {isTailor && (
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={user?.profile_image_url || '/placeholder.png'} alt="Tailor" />
                            <AvatarFallback>T</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t bg-background">
              <form className="flex items-center gap-4" onSubmit={handleSendMessage}>
                <Input
                  placeholder={t('Type your message...')}
                  className="flex-1"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sending}
                />
                <Button type="submit" disabled={sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {t('Send')}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">{t('Select a conversation')}</h3>
            <p className="text-muted-foreground">
              {t('Choose a chat from the list to start messaging.')}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

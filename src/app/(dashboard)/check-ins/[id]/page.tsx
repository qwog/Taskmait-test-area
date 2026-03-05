"use client";

import { ArrowLeft, Bot, User, Clock, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatTime, getMoodEmoji, getStatusColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import Link from "next/link";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  classification: string;
  timestamp: Date;
}

const sessionData = {
  id: "ci-1",
  elderName: "Margaret Johnson",
  elderId: "elder-1",
  status: "completed",
  startedAt: new Date(Date.now() - 1000 * 60 * 30),
  completedAt: new Date(Date.now() - 1000 * 60 * 20),
  moodScore: 8,
  aiSummary:
    "Margaret is doing well today. She had a good breakfast and is looking forward to a visit from her granddaughter this afternoon. She mentioned mild knee pain but says it is manageable. Overall mood is positive and she seems engaged and cheerful.",
};

const messages: Message[] = [
  {
    id: "msg-1",
    direction: "outbound",
    body: "Good morning, Margaret! It's your daily check-in. How are you feeling today?",
    classification: "greeting",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "msg-2",
    direction: "inbound",
    body: "Oh hello dear! I'm feeling pretty good today. Had a nice breakfast and my granddaughter is coming to visit later!",
    classification: "positive_response",
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
  },
  {
    id: "msg-3",
    direction: "outbound",
    body: "That sounds wonderful! A visit from your granddaughter must be exciting. How is your body feeling? Any aches or pains today?",
    classification: "follow_up",
    timestamp: new Date(Date.now() - 1000 * 60 * 27),
  },
  {
    id: "msg-4",
    direction: "inbound",
    body: "Well my knee has been a little sore but nothing too bad. I took my medicine this morning so that should help. Thank you for asking!",
    classification: "health_update",
    timestamp: new Date(Date.now() - 1000 * 60 * 24),
  },
];

const classificationColors: Record<string, string> = {
  greeting: "bg-blue-100 text-blue-800 border-blue-200",
  positive_response: "bg-green-100 text-green-800 border-green-200",
  follow_up: "bg-purple-100 text-purple-800 border-purple-200",
  health_update: "bg-amber-100 text-amber-800 border-amber-200",
  concern: "bg-red-100 text-red-800 border-red-200",
};

export default function CheckInDetailPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/check-ins">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Check-ins
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Check-in Session
          </h1>
          <p className="mt-1 text-gray-500">
            Conversation with {sessionData.elderName}
          </p>
        </div>
        <Badge className={cn("text-sm", getStatusColor(sessionData.status))}>
          {sessionData.status}
        </Badge>
      </div>

      {/* Session Metadata */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <User className="h-4 w-4" />
              Elder
            </div>
            <p className="font-semibold text-gray-900">{sessionData.elderName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Clock className="h-4 w-4" />
              Started At
            </div>
            <p className="font-semibold text-gray-900">
              {formatDateTime(sessionData.startedAt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="text-lg">{getMoodEmoji(sessionData.moodScore)}</span>
              Mood Score
            </div>
            <p className="font-semibold text-gray-900">{sessionData.moodScore} / 10</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Brain className="h-4 w-4" />
              Messages
            </div>
            <p className="font-semibold text-gray-900">{messages.length} messages</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      <Card className="border-teal-200 bg-teal-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-teal-800">
            <Brain className="h-5 w-5" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-teal-900 leading-relaxed">{sessionData.aiSummary}</p>
        </CardContent>
      </Card>

      {/* Conversation Thread */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => {
              const isInbound = message.direction === "inbound";
              return (
                <div
                  key={message.id}
                  className={cn("flex", isInbound ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] space-y-1.5",
                      isInbound ? "items-start" : "items-end"
                    )}
                  >
                    {/* Sender label */}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs text-gray-500",
                        !isInbound && "justify-end"
                      )}
                    >
                      {isInbound ? (
                        <>
                          <User className="h-3 w-3" />
                          <span>{sessionData.elderName}</span>
                        </>
                      ) : (
                        <>
                          <span>CheckMate AI</span>
                          <Bot className="h-3 w-3" />
                        </>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isInbound
                          ? "bg-gray-100 text-gray-900 rounded-tl-md"
                          : "bg-teal-600 text-white rounded-tr-md"
                      )}
                    >
                      {message.body}
                    </div>

                    {/* Metadata row */}
                    <div
                      className={cn(
                        "flex items-center gap-2",
                        !isInbound && "justify-end"
                      )}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          classificationColors[message.classification] ||
                            "bg-gray-100 text-gray-600"
                        )}
                      >
                        {message.classification.replace("_", " ")}
                      </Badge>
                      <span className="text-[10px] text-gray-400">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

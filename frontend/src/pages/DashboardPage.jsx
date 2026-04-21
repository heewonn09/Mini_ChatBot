import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Chart from "../components/Chart";
import AIInsightCard from "../components/ui/AIInsightCard";
import { Clock, TrendingUp, Brain, AlertCircle } from "lucide-react";
import { TrendingUp, Clock, Target, Activity } from "lucide-react"; 
function DashboardPage() {
  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Your behavior summary"
      />

      {/* 카드 영역 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6 mb-10">

  <Card
    title="Most Frequent Behavior"
    value="YouTube Browsing"
    subtitle="31 times this week"
    icon={<TrendingUp size={18} />}
    color="bg-orange-500/20 text-orange-400"
    trend="down"
  />

  <Card
    title="Worst Habit Time"
    value="9pm - 12am"
    subtitle="70% distraction rate"
    icon={<Clock size={18} />}
    color="bg-orange-400/20 text-orange-300"
    trend="down"
  />

  <Card
    title="Best Focus Time"
    value="9am - 12pm"
    subtitle="85% productivity"
    icon={<Target size={18} />}
    color="bg-emerald-500/20 text-emerald-400"
    trend="up"
  />

  <Card
    title="Weekly Progress"
    value="+12%"
    subtitle="Better than last week"
    icon={<Activity size={18} />}
    color="bg-indigo-500/20 text-indigo-400"
    trend="up"
  />

</div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Chart />
        <Chart />
      </div>

      {/* AI Insights */}
<div className="mt-8">
  <h2 className="text-lg font-semibold mb-4">AI Insights</h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    
    <AIInsightCard
      type="warning"
      title="You tend to procrastinate at night"
      description="Between 9pm-12am, your distraction rate increases by 70%. Consider limiting screen time."
    />

    <AIInsightCard
      type="success"
      title="Your focus peaks in the morning"
      description="9am-12pm shows highest productivity. Schedule deep work during this period."
    />

    <AIInsightCard
      type="info"
      title="Your consistency is improving"
      description="You maintained stable activity patterns over the past 5 days."
    />

    <AIInsightCard
      type="warning"
      title="Late sleep detected"
      description="Your sleep time is inconsistent. Try setting a fixed bedtime."
    />

  </div>
</div>
    </section>
  );
}

export default DashboardPage;
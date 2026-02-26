import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Seed Users
  const municipalAdmin = await prisma.user.upsert({
    where: { email: 'municipal@admin.com' },
    update: {},
    create: {
      name: 'City Officer',
      email: 'municipal@admin.com',
      password: hashedPassword,
      role: 'municipal_admin',
    },
  });

  const citizenAdmin = await prisma.user.upsert({
    where: { email: 'citizen@admin.com' },
    update: {},
    create: {
      name: 'Karthik',
      email: 'citizen@admin.com',
      password: hashedPassword,
      role: 'citizen_admin',
    },
  });

  // 2. Seed Clusters (for categorization)
  const clusters = [
    { name: 'Water Infrastructure', area: 'Kottapeta' },
    { name: 'Sanitation', area: 'Main Road' },
    { name: 'Public Lighting', area: 'Market Area' },
    { name: 'Road Maintenance', area: 'Bus Stand' },
    { name: 'Drainage Systems', area: 'Colony Area' }
  ];

  const clusterMap: Record<string, number> = {};
  for (const c of clusters) {
    let existing = await prisma.cluster.findFirst({ where: { cluster_name: c.name } });
    if (!existing) {
      existing = await prisma.cluster.create({
        data: {
          cluster_name: c.name,
          area: c.area,
        }
      });
    }
    clusterMap[c.name] = existing.id;
  }

  // 3. Seed Problems
  const problemsData = [
    {
      title: 'Water Leakage',
      description: 'Major pipe burst near the main square.',
      category: 'Water',
      location: 'Kottapeta',
      status: 'Pending',
      sentiment_score: -0.8,
      sentiment_label: 'Negative',
      priority_score: 0.9,
      is_urgent: true,
      cluster_id: clusterMap['Water Infrastructure'],
      user_id: citizenAdmin.id,
    },
    {
      title: 'Garbage Overflow',
      description: 'Garbage bins are overflowing and causing bad smell.',
      category: 'Garbage',
      location: 'Main Road',
      status: 'In Progress',
      sentiment_score: -0.6,
      sentiment_label: 'Negative',
      priority_score: 0.7,
      is_urgent: false,
      cluster_id: clusterMap['Sanitation'],
      user_id: citizenAdmin.id,
    },
    {
      title: 'Street Light Not Working',
      description: 'Street lights are off for the last 3 days.',
      category: 'Electricity',
      location: 'Market Area',
      status: 'Resolved',
      sentiment_score: -0.4,
      sentiment_label: 'Negative',
      priority_score: 0.5,
      is_urgent: false,
      cluster_id: clusterMap['Public Lighting'],
      user_id: citizenAdmin.id,
      resolved_at: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      title: 'Road Damage',
      description: 'Huge pothole in the middle of the road.',
      category: 'Roads',
      location: 'Bus Stand',
      status: 'Pending',
      sentiment_score: -0.7,
      sentiment_label: 'Negative',
      priority_score: 0.8,
      is_urgent: true,
      cluster_id: clusterMap['Road Maintenance'],
      user_id: citizenAdmin.id,
    },
    {
      title: 'Drainage Blockage',
      description: 'Drainage is blocked and water is entering houses.',
      category: 'Other',
      location: 'Colony Area',
      status: 'Resolved',
      sentiment_score: -0.9,
      sentiment_label: 'Very Negative',
      priority_score: 0.95,
      is_urgent: true,
      cluster_id: clusterMap['Drainage Systems'],
      user_id: citizenAdmin.id,
      resolved_at: new Date(Date.now() - 172800000), // 2 days ago
    }
  ];

  for (const p of problemsData) {
    const existingProblem = await prisma.problem.findFirst({ where: { title: p.title, location: p.location } });
    if (!existingProblem) {
      const createdProblem = await prisma.problem.create({
        data: { ...p, id: uuidv4() }
      });

      if (p.status === 'Resolved') {
        const timeTaken = Math.floor((createdProblem.resolved_at!.getTime() - createdProblem.created_at.getTime()) / 1000);
        await prisma.resolvedComment.create({
          data: {
            id: uuidv4(),
            problem_id: createdProblem.id,
            citizen_id: citizenAdmin.id,
            rating: 'Good',
            comment: 'Thank you for the quick resolution!',
            time_taken: timeTaken,
          }
        });
      }
    }
  }

  // Update cluster stats
  const allClusters = await prisma.cluster.findMany();
  for (const c of allClusters) {
    const pCount = await prisma.problem.count({ where: { cluster_id: c.id } });
    const avgSent = await prisma.problem.aggregate({
      where: { cluster_id: c.id },
      _avg: { sentiment_score: true }
    });
    await prisma.cluster.update({
      where: { id: c.id },
      data: {
        problem_count: pCount,
        avg_sentiment: avgSent._avg.sentiment_score || 0
      }
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

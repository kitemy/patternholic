import {createRouter, createWebHistory} from 'vue-router'
import Home from '@/views/Home.vue'
import Search from '@/views/Search.vue'
import BeatmapDetail from '@/views/BeatmapDetail.vue'
import Analysis from '@/views/Analysis.vue'
import Rankings from '@/views/Rankings.vue'
import Analyze from '@/views/Analyze.vue'
import TopPlays from '@/views/TopPlays.vue'
import Recommendations from '@/views/Recommendations.vue'

const router = createRouter({
    history: createWebHistory(),
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition
        if (to.path === from.path && to.path.startsWith('/beatmap/')) return false
        return {top: 0}
    },
    routes: [
        {path: '/', component: Home},
        {path: '/search', component: Search},
        {path: '/beatmap/:id', component: BeatmapDetail},
        {path: '/analysis', component: Analysis},
        {path: '/rankings', component: Rankings},
        {path: '/analyze', component: Analyze},
        {path: '/topplays', component: TopPlays},
        {path: '/recommendations', component: Recommendations},
    ]
})
export default router

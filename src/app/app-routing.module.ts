import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NewRouteComponent } from './routing/new-route/new-route.component';
import { ImportRouteComponent } from './routing/import-route/import-route.component';
import { InitRouteComponent } from './routing/init-route/init-route.component';
import { LayoutRouteComponent } from './routing/layout-route/layout-route.component';
import { AboutRouteComponent } from './routing/about-route/about-route.component';

const routes: Routes = [
  {path: '', redirectTo: 'new', pathMatch: 'full'},
  {path: 'new', component: NewRouteComponent},
  {path: 'import', component: ImportRouteComponent},
  {path: 'about', component: AboutRouteComponent},
  {path: 'init', component: InitRouteComponent},
  {
    path: 'layout/:layoutName',
    component: LayoutRouteComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
